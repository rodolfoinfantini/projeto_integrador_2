import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import postgres from 'postgres'

dotenv.config()

const sql = postgres(process.env.DATABASE_URL)

await sql`
CREATE TABLE IF NOT EXISTS cards (
    id SERIAL PRIMARY KEY,
    card_number INTEGER NOT NULL UNIQUE
);`

await sql`
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL DEFAULT ''
);`

const status = {
    PENDENTE: 0,
    CONCLUIDO: 1,
}
await sql`
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    card INTEGER NOT NULL,
    service INTEGER NOT NULL,
    status INTEGER NOT NULL DEFAULT 0,
    rewarded_from INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    released_at TIMESTAMP,
    CONSTRAINT fk_card FOREIGN KEY (card) REFERENCES cards (id),
    CONSTRAINT fk_service FOREIGN KEY (service) REFERENCES services (id),
    CONSTRAINT fk_rewarded_from FOREIGN KEY (rewarded_from) REFERENCES orders (id)
);`

await sql`
CREATE TABLE IF NOT EXISTS rewards (
    id SERIAL PRIMARY KEY,
    reward_service INTEGER NOT NULL,
    ordered_service INTEGER,
    orders_to_get INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_reward_service FOREIGN KEY (reward_service) REFERENCES services (id),
    CONSTRAINT fk_ordered_service FOREIGN KEY (ordered_service) REFERENCES services (id)
);`

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}
function createCardNumber() {
    return randomNumber(100000, 999999)
}

const app = express()
app.use(cors())
app.use(express.json())

// Get just the purchased services, excluding the rewards
async function cardBalance(card) {
    const balance = await sql`
    SELECT s.id, s.name, COUNT(o.*) FROM orders o
    INNER JOIN services s
    ON o.service = s.id
    INNER JOIN cards c
    ON c.id = o.card
    WHERE c.card_number = ${card}
    AND o.status = ${status.PENDENTE}
    AND o.rewarded_from IS null
    GROUP BY s.id
    ORDER BY s.id;`
    return balance.map((service) => ({ ...service, count: parseInt(service.count) }))
}

// Get just the rewards
async function cardRewards(card) {
    const rewards = await sql`
    SELECT s.id, s.name, COUNT(o.*) FROM orders o
    INNER JOIN services s
    ON o.service = s.id
    INNER JOIN cards c
    ON c.id = o.card
    WHERE c.card_number = ${card}
    AND o.status = ${status.PENDENTE}
    AND o.rewarded_from IS NOT null
    GROUP BY s.id
    ORDER BY s.id;`
    return rewards.map((service) => ({ ...service, count: parseInt(service.count) }))
}

async function insertReward(order, reward) {
    return await sql`INSERT INTO orders (card, service, rewarded_from) VALUES (${order.card}, ${reward.reward_service}, ${order.id}) RETURNING *`
}

async function checkReward(order) {
    const rewards = await sql`
    SELECT *
        FROM rewards r
    WHERE r.orders_to_get <=
        (
            SELECT COUNT(*)
            FROM orders o1
            WHERE o1.card = ${order.card}
            AND o1.rewarded_from IS null
            AND o1.created_at > r.created_at
            AND (r.ordered_service IS null OR o1.service = r.ordered_service)
            AND o1.id >
            (SELECT COALESCE(
                (
                    SELECT o2.id
                    FROM orders o2
                    WHERE o2.card = ${order.card}
                    AND o2.rewarded_from IS NOT null
                    AND o2.service = r.reward_service
                    ORDER BY o2.id DESC
                    LIMIT 1
                ),
                0
            ))
        );`

    if (rewards.length === 0) return []

    const insertPromises = rewards.map((reward) => insertReward(order, reward))

    const savedOrders = await Promise.all(insertPromises)

    return savedOrders.map((savedOrder) => savedOrder[0])
}

async function cardExists(number) {
    const cards = await sql`SELECT id FROM cards WHERE card_number = ${number}`
    return cards.length >= 1
}

app.post('/cards', async (_, res) => {
    let newCardNumber = createCardNumber()
    while (await cardExists(newCardNumber)) {
        newCardNumber = createCardNumber()
    }

    await sql`INSERT INTO cards (card_number) VALUES (${newCardNumber})`

    res.json({
        cardNumber: newCardNumber,
    })
})

app.get('/cards/:number', async (req, res) => {
    const { number } = req.params

    const cards = await sql`SELECT * FROM cards WHERE card_number = ${number}`
    if (cards.length === 0) return res.sendStatus(404)

    res.json(cards[0])
})

app.get('/services', async (_, res) => {
    const services = await sql`SELECT * FROM services ORDER BY name`
    res.json(services)
})

app.post('/orders', async (req, res) => {
    const { cardNumber, serviceId } = req.body
    if (!cardNumber || !serviceId) return res.sendStatus(400)

    const services = await sql`SELECT id FROM services WHERE id = ${serviceId}`
    if (services.length === 0) return res.sendStatus(404)

    const cards = await sql`SELECT id FROM cards WHERE card_number = ${cardNumber}`
    if (cards.length === 0) return res.sendStatus(404)

    const orders =
        await sql`INSERT INTO orders (card, service) VALUES (${cards[0].id}, ${serviceId}) RETURNING *`
    const order = orders[0]

    const rewardsOrders = await checkReward(order)
    const serviceIds = rewardsOrders.map((order) => order.service)
    const rewards =
        serviceIds.length > 0
            ? await sql`SELECT * FROM services WHERE id IN ${sql(serviceIds)}`
            : []

    return res.json({ ...order, rewards })
})

app.get('/cards/:number/balance', async (req, res) => {
    const { number } = req.params

    const cards = await sql`SELECT * FROM cards WHERE card_number = ${number}`
    if (cards.length === 0) return res.sendStatus(404)

    const balance = await cardBalance(number)
    const rewards = await cardRewards(number)

    res.json({ balance, rewards })
})

async function releaseOrder(orderId) {
    await sql`UPDATE orders SET status = ${status.CONCLUIDO}, released_at = NOW() WHERE id = ${orderId}`
}

app.patch('/cards/:number/balance', async (req, res) => {
    const { serviceId } = req.body
    const { number } = req.params

    const cards = await sql`SELECT id FROM cards WHERE card_number = ${number}`
    if (cards.length === 0) return res.sendStatus(404)
    const card = cards[0]

    const orders =
        await sql`SELECT min(id) id FROM orders WHERE card = ${card.id} AND service = ${serviceId} AND status = ${status.PENDENTE} AND rewarded_from IS null`
    const order = orders[0]

    if (order.id === null) return res.sendStatus(403)

    await releaseOrder(order.id)

    const balance = await cardBalance(number)
    const rewards = await cardRewards(number)

    res.json({ balance, rewards })
})

app.patch('/cards/:number/rewards', async (req, res) => {
    const { serviceId } = req.body
    const { number } = req.params

    const cards = await sql`SELECT id FROM cards WHERE card_number = ${number}`
    if (cards.length === 0) return res.sendStatus(404)
    const card = cards[0]

    const orders =
        await sql`SELECT min(id) id FROM orders WHERE card = ${card.id} AND service = ${serviceId} AND status = ${status.PENDENTE} AND rewarded_from IS NOT null`
    let order = orders[0]

    if (order.id === null)
        return res.status(403).json({ error: 'Você não possui essa recompensa!' })

    order = (await sql`SELECT * FROM orders WHERE id = ${order.id}`)[0]

    const today = new Date()
    if (
        order.created_at.getDate() === today.getDate() &&
        order.created_at.getMonth() === today.getMonth() &&
        order.created_at.getFullYear() === today.getFullYear()
    )
        return res.status(403).json({ error: 'Você só pode utilizar essa recompensa amanhã!' })

    await releaseOrder(order.id)

    const balance = await cardBalance(number)
    const rewards = await cardRewards(number)

    res.json({ balance, rewards })
})

app.listen(process.env.PORT, () => {
    console.log('Server running')
})

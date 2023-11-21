const servicesContainer = document.querySelector('.services')
const rewardsContainer = document.querySelector('.rewards')

let cardNumber
const cardInput = document.querySelector('.card-input input')

cardInput.oninput = async () => {
    if (cardInput.value.length !== 6) {
        cardNumber = undefined
        servicesContainer.innerHTML = ''
        rewardsContainer.innerHTML = ''
        return
    }
    if (await isCardNumberValid(cardInput.value)) {
        cardNumber = cardInput.value
        loadBalance()
        return
    }
    alert('Cartão inválido!')
    cardInput.value = ''
}

function loadServices(services) {
    if (!cardNumber) return

    servicesContainer.innerHTML = ''
    for (const service of services) {
        const serviceElement = document.createElement('div')
        const nameElement = document.createElement('h2')
        const countElement = document.createElement('p')
        const useButtonElement = document.createElement('button')

        serviceElement.classList.add('service')
        useButtonElement.classList.add('use')

        nameElement.textContent = service.name
        countElement.textContent = 'Saldo: ' + service.count
        useButtonElement.textContent = 'Usar'

        useButtonElement.onclick = async () => {
            const response = await fetch(`http://localhost:3000/cards/${cardNumber}/balance`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    serviceId: service.id,
                }),
            })
            if (response.status !== 200) return alert('Erro ao usar serviço.')
            const body = await response.json()
            loadServices(body.balance)
            alert('Serviço utilizado!')
        }

        serviceElement.appendChild(nameElement)
        serviceElement.appendChild(countElement)
        serviceElement.appendChild(useButtonElement)

        servicesContainer.appendChild(serviceElement)
    }
}

function loadRewards(rewards) {
    if (!cardNumber) return

    rewardsContainer.innerHTML = ''
    for (const reward of rewards) {
        const rewardElement = document.createElement('div')
        const nameElement = document.createElement('h2')
        const countElement = document.createElement('p')
        const useButtonElement = document.createElement('button')

        rewardElement.classList.add('service')
        useButtonElement.classList.add('use')

        nameElement.textContent = reward.name
        countElement.textContent = 'Saldo: ' + reward.count
        useButtonElement.textContent = 'Usar'

        useButtonElement.onclick = async () => {
            const response = await fetch(`http://localhost:3000/cards/${cardNumber}/rewards`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    serviceId: reward.id,
                }),
            })
            if (response.status !== 200 && response.status !== 403)
                return alert('Erro ao usar recompensa.')

            const body = await response.json()
            if (response.status === 403) return alert(body.error)

            loadRewards(body.rewards)
            alert('Recompensa utilizada!')
        }

        rewardElement.appendChild(nameElement)
        rewardElement.appendChild(countElement)
        rewardElement.appendChild(useButtonElement)

        rewardsContainer.appendChild(rewardElement)
    }
}

async function loadBalance() {
    const response = await fetch(`http://localhost:3000/cards/${cardNumber}/balance`)
    const balance = await response.json()
    loadServices(balance.balance)
    loadRewards(balance.rewards)
}

async function isCardNumberValid(cardNumber) {
    const response = await fetch(`http://localhost:3000/cards/${cardNumber}`)
    return response.status === 200
}

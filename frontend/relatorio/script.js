const servicesContainer = document.querySelector('.services')
const rewardsContainer = document.querySelector('.rewards')

let cardNumber
const cardInput = document.querySelector('.card-input input')

cardInput.oninput = async () => {
    if (cardInput.value.length !== 6) {
        cardNumber = undefined

        servicesContainer.querySelector('.ordered .content').innerHTML = ''
        servicesContainer.querySelector('.released .content').innerHTML = ''
        servicesContainer.querySelector('.balance .content').innerHTML = ''
        balanceContainer.querySelector('.earned .content').innerHTML = ''
        balanceContainer.querySelector('.released .content').innerHTML = ''
        balanceContainer.querySelector('.balance .content').innerHTML = ''

        return
    }
    if (await isCardNumberValid(cardInput.value)) {
        cardNumber = cardInput.value
        await loadReport()
        return
    }
    alert('Cartão inválido!')
    cardInput.value = ''
}

function balanceParagraphs(list, container) {
    for (const item of list) {
        const p = document.createElement('p')
        const serviceSpan = document.createElement('span')
        const countSpan = document.createElement('span')

        serviceSpan.innerText = item.name
        countSpan.innerText = item.count

        p.appendChild(serviceSpan)
        p.appendChild(countSpan)

        container.appendChild(p)
    }
}

function serviceDateParagraphs(list, container) {
    for (const item of list) {
        const p = document.createElement('p')
        const serviceSpan = document.createElement('span')
        const dateSpan = document.createElement('span')

        const date = new Date(item.date)

        serviceSpan.innerText = item.service
        dateSpan.innerText = `${date.getDate()}/${date.getMonth()}/${date.getFullYear()}`

        p.appendChild(serviceSpan)
        p.appendChild(dateSpan)

        container.appendChild(p)
    }
}

async function loadServices(services) {
    const orderedContainer = servicesContainer.querySelector('.ordered .content')
    const releasedContainer = servicesContainer.querySelector('.released .content')
    const balanceContainer = servicesContainer.querySelector('.balance .content')
    orderedContainer.innerHTML = ''
    releasedContainer.innerHTML = ''
    balanceContainer.innerHTML = ''
    serviceDateParagraphs(services.ordered, orderedContainer)
    serviceDateParagraphs(services.released, releasedContainer)
    balanceParagraphs(services.balance, balanceContainer)
}

async function loadRewards(rewards) {
    const earnedContainer = rewardsContainer.querySelector('.earned .content')
    const releasedContainer = rewardsContainer.querySelector('.released .content')
    const balanceContainer = rewardsContainer.querySelector('.balance .content')
    earnedContainer.innerHTML = ''
    releasedContainer.innerHTML = ''
    balanceContainer.innerHTML = ''
    serviceDateParagraphs(rewards.earned, earnedContainer)
    serviceDateParagraphs(rewards.released, releasedContainer)
    balanceParagraphs(rewards.balance, balanceContainer)
}

async function loadReport() {
    if (!cardNumber) {
        alert('Cartão inválido!')
        return
    }
    const response = await fetch(`http://localhost:3000/cards/${cardNumber}/report`)
    const report = await response.json()

    await loadServices(report.services)
    await loadRewards(report.rewards)
}

async function isCardNumberValid(cardNumber) {
    const response = await fetch(`http://localhost:3000/cards/${cardNumber}`)
    return response.status === 200
}

const servicesContainer = document.querySelector('.services')

let cardNumber
const cardInput = document.querySelector('.card-input input')

cardInput.oninput = async () => {
    if (cardInput.value.length !== 6) {
        cardNumber = undefined
        return
    }
    if (await isCardNumberValid(cardInput.value)) {
        cardNumber = cardInput.value
        return
    }
    alert('Cartão inválido!')
    cardInput.value = ''
}

async function loadServices() {
    const response = await fetch('http://localhost:3000/services')
    const services = await response.json()

    for (const service of services) {
        const serviceElement = document.createElement('div')
        const nameElement = document.createElement('h2')
        const descriptionElement = document.createElement('p')
        const buyButtonElement = document.createElement('button')

        serviceElement.classList.add('service')
        buyButtonElement.classList.add('buy')

        nameElement.textContent = service.name
        descriptionElement.textContent = service.description
        buyButtonElement.textContent = 'Comprar'

        buyButtonElement.onclick = async () => {
            if (!cardNumber) return alert('Você precisa informar um cartão.')
            const response = await fetch(`http://localhost:3000/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cardNumber,
                    serviceId: service.id,
                }),
            })
            if (response.status !== 200) return alert('Erro ao comprar serviço.')
            const body = await response.json()
            let message = 'Compra realizada com sucesso!'
            if (body.rewards?.length > 0) {
                message += '\n\nParabéns! Você ganhou as seguintes recompensas:'
                for (const reward of body.rewards) message += `\n  - ${reward.name}`
            }
            alert(message)
        }

        serviceElement.appendChild(nameElement)
        serviceElement.appendChild(descriptionElement)
        serviceElement.appendChild(buyButtonElement)

        servicesContainer.appendChild(serviceElement)
    }
}

async function isCardNumberValid(cardNumber) {
    const response = await fetch(`http://localhost:3000/cards/${cardNumber}`)
    return response.status === 200
}

loadServices()

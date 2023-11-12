const createCardButton = document.querySelector('button.create-card')

createCardButton.onclick = async () => {
    createCardButton.remove()

    const response = await fetch('http://localhost:3000/cards', { method: 'POST' })
    const card = await response.json()

    const div = document.createElement('div')
    div.classList.add('card')

    const h2 = document.createElement('h2')
    h2.textContent = card.cardNumber

    div.appendChild(h2)

    document.body.appendChild(div)
}

const servicesContainer = document.querySelector('.services')
const rewardsContainer = document.querySelector('.rewards')

function countParagraphs(list, container) {
    for (const item of list) {
        const p = document.createElement('p')
        const serviceSpan = document.createElement('span')
        const countSpan = document.createElement('span')

        serviceSpan.innerText = item.service
        countSpan.innerText = item.count

        p.appendChild(serviceSpan)
        p.appendChild(countSpan)

        container.appendChild(p)
    }
}

async function loadServices(services) {
    const orderedContainer = servicesContainer.querySelector('.ordered .content')
    const releasedContainer = servicesContainer.querySelector('.released .content')
    const notReleasedContainer = servicesContainer.querySelector('.not-released .content')
    countParagraphs(services.ordered, orderedContainer)
    countParagraphs(services.released, releasedContainer)
    countParagraphs(services.notReleased, notReleasedContainer)
}

async function loadRewards(rewards) {
    const earnedContainer = rewardsContainer.querySelector('.earned .content')
    earnedContainer.innerHTML = ''
    countParagraphs(rewards.earned, earnedContainer)
}

async function loadReport() {
    const response = await fetch(`http://localhost:3000/report`)
    const report = await response.json()

    await loadServices(report.services)
    await loadRewards(report.rewards)
}

loadReport()

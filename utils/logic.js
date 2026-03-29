function validateTicket(data) {
    const errors = [];
    if (Number(data.quantity) <= 0) errors.push("Số lượng phải > 0");
    if (Number(data.pricePerTicket) <= 0) errors.push("Giá vé phải > 0");
    const today = new Date();
    today.setHours(0,0,0,0);
    if (new Date(data.eventDate) < today) errors.push("Ngày sự kiện không được nhỏ hơn ngày hiện tại");
    if (!['Standard', 'VIP', 'VVIP'].includes(data.category)) errors.push("Category không hợp lệ");
    return errors;
}

function processBusinessLogic(category, quantity, pricePerTicket) {
    const qty = Number(quantity);
    const price = Number(pricePerTicket);
    const totalAmount = qty * price;
    let discountRate = 0;
    if (category === 'VIP' && qty >= 4) discountRate = 0.10;
    else if (category === 'VVIP' && qty >= 2) discountRate = 0.15;
    const finalAmount = totalAmount * (1 - discountRate);
    const discountLabel = discountRate > 0 ? "Được giảm giá" : "Không giảm giá";
    return { totalAmount, finalAmount, discountLabel };
}

function searchTickets(tickets, keyword) {
    if (!keyword) return tickets;
    const kw = keyword.toLowerCase();
    return tickets.filter(t => t.eventName.toLowerCase().includes(kw) || t.holderName.toLowerCase().includes(kw));
}

function filterByStatus(tickets, status) {
    if (!status) return tickets;
    return tickets.filter(t => t.status === status);
}

module.exports = { validateTicket, processBusinessLogic, searchTickets, filterByStatus };
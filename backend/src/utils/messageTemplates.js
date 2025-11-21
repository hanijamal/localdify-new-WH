export function generateConfirmationMessage(name, service, date, time, salonName) {
    return `✨ Hello ${name}! ✨\n\nYour appointment at *${salonName}* is confirmed!\n\n*Service:* ${service}\n*Date:* ${date}\n*Time:* ${time}\n\nWe look forward to seeing you!`;
}

export function generateReminderMessage(name, date, time) {
    return `👋 Hi ${name}! Just a friendly reminder about your upcoming appointment tomorrow, ${date} at ${time}.\n\nSee you soon!`;
}

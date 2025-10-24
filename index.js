require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, AttachmentBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const token = process.env.DISCORD_TOKEN;
const NOTIFICATION_CHANNEL_ID = "1431415872395677706";
const MEDIA_CHANNEL_ID = "1431415482204033094";
const NOTIFICATION_ROLE_ID = "1431416078310834206";

let subscriptions = {};
const subsFile = './subs.json';

if (fs.existsSync(subsFile)) {
    subscriptions = JSON.parse(fs.readFileSync(subsFile));
}

function saveSubs() {
    fs.writeFileSync(subsFile, JSON.stringify(subscriptions, null, 2));
}

// Функция для создания embed с картинкой
function createNotificationEmbed() {
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🔔 Система уведомлений Freak Mods')
        .setDescription('**Не пропустите важные объявления и события!**\n\nПодпишитесь на уведомления, чтобы получать важные сообщения прямо в личные сообщения.')
        .addFields(
            { name: '📬 Что вы получите:', value: '• Важные объявления\n• Новости проекта\n• Эксклюзивные события\n• Срочные уведомления' },
            { name: '⚡ Как это работает:', value: 'Нажмите кнопку ниже чтобы подписаться/отписаться' }
        )
        .setImage('attachment://freak_mods.png')
        .setFooter({ text: 'Freak Mods • Ваш надежный компаньон', iconURL: 'https://i.imgur.com/xV6e6aM.png' })
        .setTimestamp();

    return embed;
}

// Функция для создания embed медиа-канала
function createMediaEmbed() {
    const embed = new EmbedBuilder()
        .setColor(0xFF6B35)
        .setTitle('📢 Панель управления рассылкой')
        .setDescription('**Отправка массовых уведомлений подписчикам**\n\nИспользуйте эту панель для отправки важных сообщений всем подписчикам уведомлений.')
        .addFields(
            { name: '📤 Как отправить:', value: '1. Нажмите кнопку "Отправить рассылку"\n2. Отправьте сообщение в этот канал\n3. Бот перешлет его всем подписчикам' },
            { name: '⚠️ Внимание:', value: 'Эта функция доступна только медиа-команде' }
        )
        .setFooter({ text: 'Freak Mods • Система рассылки', iconURL: 'https://i.imgur.com/xV6e6aM.png' })
        .setTimestamp();

    return embed;
}

client.once(Events.ClientReady, () => {
    console.log(`Бот онлайн: ${client.user.tag}`);
    
    // Автоматически создаем сообщения в каналах при запуске
    setTimeout(async () => {
        try {
            const notificationChannel = await client.channels.fetch(NOTIFICATION_CHANNEL_ID);
            const mediaChannel = await client.channels.fetch(MEDIA_CHANNEL_ID);
            
            // Очищаем предыдущие сообщения бота в этих каналах
            const messages = await notificationChannel.messages.fetch({ limit: 10 });
            const botMessages = messages.filter(msg => msg.author.id === client.user.id);
            await notificationChannel.bulkDelete(botMessages);
            
            const mediaMessages = await mediaChannel.messages.fetch({ limit: 10 });
            const botMediaMessages = mediaMessages.filter(msg => msg.author.id === client.user.id);
            await mediaChannel.bulkDelete(botMediaMessages);
            
            // Создаем сообщение в канале уведомлений
            const notificationRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('toggle_notifications')
                        .setLabel('🔔 Включить уведомления')
                        .setStyle(ButtonStyle.Primary)
                );
            
            const image = new AttachmentBuilder('./freak_mods.png');
            await notificationChannel.send({
                embeds: [createNotificationEmbed()],
                files: [image],
                components: [notificationRow]
            });
            
            // Создаем сообщение в медиа-канале
            const mediaRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('send_broadcast')
                        .setLabel('📤 Отправить рассылку')
                        .setStyle(ButtonStyle.Danger)
                );
            
            await mediaChannel.send({
                embeds: [createMediaEmbed()],
                components: [mediaRow]
            });
            
            console.log('Сообщения успешно созданы в каналах!');
            
        } catch (error) {
            console.log('Ошибка при создании сообщений:', error);
        }
    }, 5000);
});

// Обработка взаимодействий с кнопками
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'toggle_notifications') {
        const userId = interaction.user.id;
        const member = interaction.member;
        
        if (subscriptions[userId]) {
            // Отписываемся
            delete subscriptions[userId];
            if (member && NOTIFICATION_ROLE_ID) {
                try {
                    await member.roles.remove(NOTIFICATION_ROLE_ID);
                } catch (error) {
                    console.log('Ошибка при удалении роли:', error);
                }
            }
            saveSubs();
            
            // Обновляем кнопку
            const updatedRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('toggle_notifications')
                        .setLabel('🔔 Включить уведомления')
                        .setStyle(ButtonStyle.Primary)
                );
            
            await interaction.update({ components: [updatedRow] });
            await interaction.followUp({ 
                content: '❌ Вы отписались от уведомлений', 
                ephemeral: true 
            });
            
        } else {
            // Подписываемся
            subscriptions[userId] = true;
            if (member && NOTIFICATION_ROLE_ID) {
                try {
                    await member.roles.add(NOTIFICATION_ROLE_ID);
                } catch (error) {
                    console.log('Ошибка при выдаче роли:', error);
                }
            }
            saveSubs();
            
            // Обновляем кнопку
            const updatedRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('toggle_notifications')
                        .setLabel('🔕 Отключить уведомления')
                        .setStyle(ButtonStyle.Secondary)
                );
            
            await interaction.update({ components: [updatedRow] });
            await interaction.followUp({ 
                content: '✅ Вы подписались на уведомления! Теперь вы будете получать важные сообщения в ЛС.', 
                ephemeral: true 
            });
        }
    }
    
    if (interaction.customId === 'send_broadcast') {
        // Проверяем права пользователя
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return await interaction.reply({ 
                content: '❌ Эта функция доступна только для медиа-команды!', 
                ephemeral: true 
            });
        }
        
        await interaction.reply({ 
            content: '📝 Теперь отправьте сообщение в этот канал (текст или с изображением), и оно будет разослано всем подписчикам.', 
            ephemeral: true 
        });
    }
});

// Обработка сообщений в медиа-канале для рассылки
client.on(Events.MessageCreate, async message => {
    // Рассылка уведомлений подписчикам
    if (message.channel.id === MEDIA_CHANNEL_ID && !message.author.bot) {
        // Проверяем, имеет ли пользователь права администратора
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return; // Не админ - игнорируем
        }
        
        // Получаем предыдущее сообщение бота с кнопкой
        const messages = await message.channel.messages.fetch({ limit: 5 });
        const botMessage = messages.find(msg => 
            msg.author.id === client.user.id && 
            msg.components.length > 0
        );
        
        if (botMessage && message.createdTimestamp > botMessage.createdTimestamp) {
            // Это ответ на запрос рассылки
            const subscribedUsers = Object.keys(subscriptions);
            let successCount = 0;
            let failCount = 0;
            
            // Создаем embed для рассылки
            const broadcastEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('📢 Важное уведомление от Freak Mods')
                .setDescription(message.content || '')
                .setFooter({ text: 'Freak Mods • Система уведомлений', iconURL: 'https://i.imgur.com/xV6e6aM.png' })
                .setTimestamp();
            
            // Добавляем изображение если есть
            if (message.attachments.size > 0) {
                broadcastEmbed.setImage(message.attachments.first().url);
            }
            
            // Рассылаем всем подписчикам
            for (const userId of subscribedUsers) {
                try {
                    const user = await client.users.fetch(userId);
                    await user.send({ embeds: [broadcastEmbed] });
                    successCount++;
                } catch (err) {
                    console.log(`Не удалось отправить сообщение ${userId}: ${err}`);
                    failCount++;
                }
            }
            
            // Отправляем отчет о рассылке
            const reportEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('📊 Отчет о рассылке')
                .setDescription(`Рассылка успешно отправлена!`)
                .addFields(
                    { name: '✅ Успешно:', value: `${successCount} пользователей`, inline: true },
                    { name: '❌ Ошибки:', value: `${failCount} пользователей`, inline: true },
                    { name: '📝 Итого:', value: `${subscribedUsers.length} подписчиков`, inline: true }
                )
                .setTimestamp();
            
            await message.reply({ embeds: [reportEmbed] });
        }
    }
});

client.login(token);
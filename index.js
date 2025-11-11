require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    Events
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const token = process.env.DISCORD_TOKEN;

if (!token) {
    console.error('DISCORD_TOKEN отсутствует в .env. Добавьте токен и перезапустите бота.');
    process.exit(1);
}

const STORE_CHANNELS = {
    PRIVATE: '1437832849339449394',
    CINEMATIC: '1437845275132825620',
    NITRO: '1437845932564807720'
};

const CONTACT_USER_ID = process.env.SALES_CONTACT_ID || '1196161068779700296';
const CONTACT_USER_TAG = process.env.SALES_CONTACT_TAG || '@minion_freak';
const SUPPORT_CHANNEL_ID = process.env.SUPPORT_CHANNEL_ID || '1348808164904272025';
const BRAND_PRIMARY_COLOR = (() => {
    const raw = process.env.BRAND_COLOR || '2b2d31'; // нейтральный серо-графитовый по умолчанию
    const hex = raw.replace('#', '');
    const parsed = Number.parseInt(hex, 16);
    return Number.isNaN(parsed) ? 0x2b2d31 : parsed;
})();

const BRAND_BANNER_URL = process.env.BRAND_BANNER_URL || 'https://imgur.com/a/neFpsVm';
const BRAND_FOOTER_TEXT = process.env.BRAND_FOOTER_TEXT || 'Freak Mods • Надежный поставщик';
const BRAND_ICON_URL = process.env.BRAND_FOOTER_ICON_URL || BRAND_BANNER_URL;
const PRIVATE_PREVIEW_URL = process.env.PRIVATE_PREVIEW_URL || null;

const contactMention = CONTACT_USER_ID ? `<@${CONTACT_USER_ID}>` : CONTACT_USER_TAG;
const supportChannelMention = SUPPORT_CHANNEL_ID ? `<#${SUPPORT_CHANNEL_ID}>` : 'канале «『💳』тикет-для-заказов»';

const products = {
    private: {
        name: '🎮 ПРИВАТНЫЙ КАНАЛ',
        description: 'Эксклюзивный доступ к приватному каналу Freak Mods с регулярными обновлениями контента.',
        features: [
            '✅ 100+ ганпаков',
            '✅ 100+ редуксов',
            '✅ 50+ уникальных сборок',
            '✅ Ежедневные обновления и техническая поддержка'
        ],
        price: '999 ₽',
        perks: 'Доступ бессрочный, обновления включены.'
    },
    cinematic: {
        name: '🎬 CINEMATIC PRICE',
        description: 'Разговорные пролетки для видео',
        items: [
            {
                title: '**Паки пролеток:**',
                lines: [
                    '10 пролеток (без расстановки) - **1000₽**',
                    '5 пролеток (с расстановкой) - **1200₽**'
                ]
            },
            {
                title: '**поштучно:**',
                lines: [
                    '1 пролетка (без расстановки) - **100₽**',
                    '1 пролетка (с расстановкой) - **300₽**'
                ]
            },
            {
                title: '**Редукс**',
                lines: [
                    'отснять редукс (без монтажа) - **2000₽**',
                    'отснять редукс (с монтажом) - **4000₽**'
                ]
            },
            {
                title: '**Скрины:**',
                lines: [
                    '1 скрин на превью - **100 ₽**',
                    'сохранить вашего персонажа для будущих пролеток - **50 ₽**'
                ]
            }
        ],
        orderInfo: `Для заказа - ${supportChannelMention}`
    },
    nitro: {
        name: '⚡ DISCORD NITRO',
        description: 'Выберите удобный тариф и получите ключ сразу после оплаты.',
        plans: {
            basic: {
                label: 'Nitro Basic',
                prices: {
                    '1 месяц': '300 ₽',
                    '3 месяца': '800 ₽',
                    '6 месяцев': '1500 ₽',
                    '1 год': '2800 ₽'
                }
            },
            full: {
                label: 'Nitro Full',
                prices: {
                    '1 месяц': '500 ₽',
                    '3 месяца': '1200 ₽',
                    '6 месяцев': '2200 ₽',
                    '1 год': '4000 ₽',
                    'Апгрейд с Basic до Full': '200 ₽'
                }
            }
        }
    }
};

function buildEmbedBase() {
    const base = new EmbedBuilder()
        .setColor(BRAND_PRIMARY_COLOR)
        .setFooter({ text: BRAND_FOOTER_TEXT, iconURL: BRAND_ICON_URL })
        .setTimestamp();

    if (BRAND_BANNER_URL) {
        base.setImage(BRAND_BANNER_URL);
    }

    return base;
}

function createPrivateEmbed() {
    return buildEmbedBase()
        .setTitle(products.private.name)
        .setDescription(products.private.description)
        .addFields(
            { name: '📦 Что входит', value: products.private.features.join('\n') },
            { name: '💰 Стоимость', value: `**${products.private.price}**`, inline: true },
            { name: '♾️ Срок доступа', value: products.private.perks, inline: true },
            { name: '🛒 Как заказать', value: `Нажмите кнопку ниже, бот подскажет, что делать.` }
        );
}

function createCinematicEmbed() {
    const embed = buildEmbedBase()
        .setTitle(products.cinematic.name)
        .setDescription(`*${products.cinematic.description}*`);

    products.cinematic.items.forEach(item => {
        const formattedValue = item.lines.join('\n');
        embed.addFields({ name: item.title, value: formattedValue, inline: false });
    });

    embed.addFields({ name: '\u200b', value: products.cinematic.orderInfo });

    return embed;
}

function createNitroEmbed() {
    const basicValues = Object.entries(products.nitro.plans.basic.prices)
        .map(([period, price]) => `• **${period}** — ${price}`)
        .join('\n');

    const fullValues = Object.entries(products.nitro.plans.full.prices)
        .map(([period, price]) => `• **${period}** — ${price}`)
        .join('\n');

    return buildEmbedBase()
        .setTitle(products.nitro.name)
        .setDescription(products.nitro.description)
        .addFields(
            { name: products.nitro.plans.basic.label, value: basicValues, inline: true },
            { name: products.nitro.plans.full.label, value: fullValues, inline: true },
            { name: '🛒 Как заказать', value: `Выберите вариант при помощи кнопок ниже. Бот подскажет дальнейшие шаги.` }
        );
}

// Флаг для отслеживания инициализации
let isInitialized = false;
const lastUpdateTime = {};

async function ensureChannelContent(channelId, payloadBuilder) {
    // Защита от частых обновлений - не чаще раза в 5 минут
    const now = Date.now();
    if (lastUpdateTime[channelId] && (now - lastUpdateTime[channelId]) < 300000) {
        console.log(`Пропускаем обновление канала ${channelId} - слишком часто`);
        return;
    }

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isTextBased()) {
            console.warn(`Канал ${channelId} недоступен или не является текстовым.`);
            return;
        }
            
        const recentMessages = await channel.messages.fetch({ limit: 10 });
        const botMessages = recentMessages.filter(msg => 
            msg.author.id === client.user.id && 
            msg.components && 
            msg.components.length > 0
        );

        // Если уже есть актуальное сообщение с кнопками - НЕ ТРОГАЕМ ЕГО
        if (botMessages.size > 0) {
            // Проверяем возраст самого свежего сообщения
            const newestMessage = botMessages.first();
            const messageAge = now - newestMessage.createdTimestamp;
            
            // Если сообщение свежее 10 минут - не трогаем
            if (messageAge < 600000) {
                console.log(`Канал ${channelId} содержит свежее сообщение (${Math.round(messageAge / 1000)}с назад), пропускаем обновление`);
                return;
            }
            
            // Если инициализация уже прошла и есть сообщение - не трогаем
            if (isInitialized) {
                console.log(`Канал ${channelId} уже содержит актуальное сообщение, пропускаем обновление`);
                return;
            }
        }

        // Удаляем старые сообщения только при первой инициализации
        if (botMessages.size > 0 && !isInitialized) {
            for (const [, message] of botMessages) {
                if (message.deletable) {
                    await message.delete().catch(() => undefined);
                }
            }
        }

        const payload = typeof payloadBuilder === 'function' ? payloadBuilder() : payloadBuilder;
        await channel.send(payload);
        lastUpdateTime[channelId] = Date.now();
        console.log(`Сообщение магазина обновлено в канале ${channelId}`);
    } catch (error) {
        console.error(`Не удалось обновить канал ${channelId}:`, error);
    }
}

function buildPrivateMessage() {
    const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
            .setCustomId('order_private')
            .setLabel('🛒 Купить приватный канал')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
            .setCustomId('ask_private')
            .setLabel('❓ Вопросы по доступу')
            .setStyle(ButtonStyle.Secondary)
    );

    return {
        embeds: [createPrivateEmbed()],
        components: [buttons]
    };
}

function buildCinematicMessage() {
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('order_cinematic_pack')
            .setLabel('🎬 Заказать пак')
            .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
            .setCustomId('order_cinematic_single')
            .setLabel('🎯 Заказать штучно')
            .setStyle(ButtonStyle.Secondary)
    );

    return {
        embeds: [createCinematicEmbed()],
        components: [buttons]
    };
}

function buildNitroMessage() {
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('order_nitro_basic')
            .setLabel('⚡ Nitro Basic')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId('order_nitro_full')
            .setLabel('🎁 Nitro Full')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('order_nitro_upgrade')
            .setLabel('⬆️ Апгрейд Basic → Full')
            .setStyle(ButtonStyle.Secondary)
    );

    return {
        embeds: [createNitroEmbed()],
        components: [buttons]
    };
}

client.once(Events.ClientReady, async () => {
    console.log(`Магазин Freak Mods запущен как ${client.user.tag}`);

    await ensureChannelContent(STORE_CHANNELS.PRIVATE, buildPrivateMessage);
    await ensureChannelContent(STORE_CHANNELS.CINEMATIC, buildCinematicMessage);
    await ensureChannelContent(STORE_CHANNELS.NITRO, buildNitroMessage);
    
    // Устанавливаем флаг после первой инициализации
    isInitialized = true;
    console.log('Инициализация магазина завершена');
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton()) return;

    const replyOptions = {
        ephemeral: true
    };

    try {
        switch (interaction.customId) {
            case 'order_private':
                return interaction.reply({
                    ...replyOptions,
                    content: [
                        '🎮 **Заказ приватного канала**',
                        '',
                        `1. Подготовьте способ оплаты.`,
                        `2. Напишите ${contactMention} или откройте тикет в ${supportChannelMention}.`,
                        '3. Укажите свой Discord тег и желаемый способ оплаты.',
                        '',
                        'После подтверждения оплаты вы получите постоянный доступ в приват.'
                    ].join('\n')
                });

            case 'ask_private':
                return interaction.reply({
                    ...replyOptions,
                    content: [
                        '❓ **Вопросы по приватному каналу**',
                        '',
                        `Задайте любой вопрос ${contactMention} или через тикет ${supportChannelMention}.`,
                        'Мы расскажем об обновлениях, содержимом и поможем выбрать тариф.'
                    ].join('\n')
                });

            case 'order_cinematic_pack':
                return interaction.reply({
                    ...replyOptions,
                    content: [
                        '🎬 **Пакет пролеток**',
                        '',
                        'Укажите при заказе:',
                        '• Нужный пак (10 без расстановки / 5 с расстановкой)',
                        '• Пожелания по стилю и времени',
                        `• Свой контакт для обратной связи (${contactMention})`,
                        '',
                        `Откройте тикет в ${supportChannelMention} и приложите референсы, если они есть.`
                    ].join('\n')
                });

            case 'order_cinematic_single':
                return interaction.reply({
                    ...replyOptions,
                    content: [
                        '🎯 **Поштучные пролетки и услуги**',
                        '',
                        'Цены:',
                        '• 1 пролетка без расстановки — 150 ₽',
                        '• 1 пролетка с расстановкой — 350 ₽',
                        '• Отснять редукс без монтажа — 2500 ₽',
                        '• Отснять редукс с монтажом — 3500 ₽',
                        '• 1 скрин на превью — 100 ₽',
                        '• Сохранить персонажа — 50 ₽',
                        '',
                        `Оформление через тикет в ${supportChannelMention}.`
                    ].join('\n')
                });

            case 'order_nitro_basic':
                return interaction.reply({
                    ...replyOptions,
                    content: [
                        '⚡ **Nitro Basic**',
                        '',
                        'Доступные сроки:',
                        '• 1 месяц — 300 ₽',
                        '• 3 месяца — 800 ₽',
                        '• 6 месяцев — 1500 ₽',
                        '• 1 год — 2800 ₽',
                        '',
                        `Напишите ${contactMention} или создайте тикет в ${supportChannelMention}, чтобы получить ключ сразу после оплаты.`
                    ].join('\n')
                });

            case 'order_nitro_full':
                return interaction.reply({
                    ...replyOptions,
                    content: [
                        '🎁 **Nitro Full**',
                        '',
                        'Доступные сроки:',
                        '• 1 месяц — 500 ₽',
                        '• 3 месяца — 1200 ₽',
                        '• 6 месяцев — 2200 ₽',
                        '• 1 год — 4000 ₽',
                        '',
                        `Для покупки свяжитесь с ${contactMention} или через ${supportChannelMention}.`
                    ].join('\n')
                });

            case 'order_nitro_upgrade':
                return interaction.reply({
                    ...replyOptions,
                    content: [
                        '⬆️ **Апгрейд Nitro Basic → Nitro Full**',
                        '',
                        'Стоимость апгрейда — 200 ₽.',
                        '',
                        `Откройте тикет в ${supportChannelMention} и укажите данные текущей подписки.`,
                        `Также можете написать напрямую ${contactMention}.`
                    ].join('\n')
                });

            default:
                return interaction.reply({ ...replyOptions, content: 'Команда не распознана. Попробуйте еще раз.' });
        }
    } catch (error) {
        if (!interaction.replied) {
            await interaction.reply({
                ...replyOptions,
                content: 'Произошла ошибка при обработке запроса. Попробуйте снова или обратитесь к администрации.'
            }).catch(() => undefined);
        }
        console.error('Ошибка при обработке взаимодействия:', error);
    }
});

client.login(token);
export function barovia() {
    return {
        name: "Barovian Calendar",
        id: "barovia-lunar",
        description: "The lunar calendar of Barovia, where the moon cycles determine the passage of time.",
        years: {
            yearZero: 0,
            firstWeekday: 0,
            resetWeekdays: false,
            leapYear: {
                leapStart: 0,
                leapInterval: 0
            }
        },
        months: {
            values: [
                { name: "Yinyavr", abbreviation: "Yin", ordinal: 1, days: 30 },
                { name: "Fenravr", abbreviation: "Fen", ordinal: 2, days: 30 },
                { name: "Martavr", abbreviation: "Mar", ordinal: 3, days: 30 },
                { name: "Prylla", abbreviation: "Pry", ordinal: 4, days: 30 },
                { name: "Mada", abbreviation: "Mad", ordinal: 5, days: 30 },
                { name: "Eyun", abbreviation: "Eyu", ordinal: 6, days: 30 },
                { name: "Eyul", abbreviation: "Eyl", ordinal: 7, days: 30 },
                { name: "Ugavr", abbreviation: "Uga", ordinal: 8, days: 30 },
                { name: "Sintavr", abbreviation: "Sin", ordinal: 9, days: 30 },
                { name: "Ottyavr", abbreviation: "Ott", ordinal: 10, days: 30 },
                { name: "Neyavr", abbreviation: "Ney", ordinal: 11, days: 30 },
                { name: "Dekavr", abbreviation: "Dek", ordinal: 12, days: 30 }
            ]
        },
        days: {
            values: [
                { name: "Firstday", abbreviation: "1st", ordinal: 1 },
                { name: "Secondday", abbreviation: "2nd", ordinal: 2 },
                { name: "Thirdday", abbreviation: "3rd", ordinal: 3 },
                { name: "Fourthday", abbreviation: "4th", ordinal: 4 },
                { name: "Fifthday", abbreviation: "5th", ordinal: 5 },
                { name: "Sixthday", abbreviation: "6th", ordinal: 6 },
                { name: "Seventhday", abbreviation: "7th", ordinal: 7 }
            ],
            daysPerYear: 360,
            hoursPerDay: 24,
            minutesPerHour: 60,
            secondsPerMinute: 60
        },
        seasons: {
            values: [
                { name: "Cold Moon", monthStart: 1, monthEnd: 1 },
                { name: "Wolf Moon", monthStart: 2, monthEnd: 2 },
                { name: "Raven Moon", monthStart: 3, monthEnd: 3 },
                { name: "Rain Moon", monthStart: 4, monthEnd: 4 },
                { name: "Maid Moon", monthStart: 5, monthEnd: 5 },
                { name: "Summer Moon", monthStart: 6, monthEnd: 6 },
                { name: "War Moon", monthStart: 7, monthEnd: 7 },
                { name: "Wine Moon", monthStart: 8, monthEnd: 8 },
                { name: "Harvest Moon", monthStart: 9, monthEnd: 9 },
                { name: "Hunter's Moon", monthStart: 10, monthEnd: 10 },
                { name: "Rot Moon", monthStart: 11, monthEnd: 11 },
                { name: "Winter Moon", monthStart: 12, monthEnd: 12 }
            ]
        },
        moons: {
            values: [
                {
                    name: "Luna",
                    cycleLength: 30,
                    firstNewMoon: { year: 0, month: 0, day: 1 },
                    color: "#dfb8b8",
                    phases: [
                        { name: "New Moon", length: 3.75, display: "New Moon", icon: "fa-circle" },
                        { name: "Waxing Crescent", length: 3.75, display: "Waxing Crescent", icon: "fa-moon" },
                        { name: "First Quarter", length: 3.75, display: "First Quarter", icon: "fa-adjust" },
                        { name: "Waxing Gibbous", length: 3.75, display: "Waxing Gibbous", icon: "fa-moon" },
                        { name: "Full Moon", length: 3.75, display: "Full Moon", icon: "fa-circle" },
                        { name: "Waning Gibbous", length: 3.75, display: "Waning Gibbous", icon: "fa-moon" },
                        { name: "Last Quarter", length: 3.75, display: "Last Quarter", icon: "fa-adjust fa-flip-horizontal" },
                        { name: "Waning Crescent", length: 3.75, display: "Waning Crescent", icon: "fa-moon" }
                    ]
                }
            ]
        },
        weather: {
            values: [
                { name: "Winter", monthStart: 12, monthEnd: 1, tempOffset: -20 },
                { name: "Spring", monthStart: 2, monthEnd: 7, tempOffset: 5 },
                { name: "Autumn", monthStart: 8, monthEnd: 11, tempOffset: 5 }
            ]
        },
        notes: [
            { title: "New Year's Day", content: "Celebrations to the New Year, with gifts given for luck, health, and prosperity.", icon: "fas fa-glass-cheers", date: { year: 0, month: 0, day: 0 }, repeatUnit: "years", repeatInterval: 1, repeatCount: 0, isPreset: true },
            { title: "Imbolc", content: "The Promise of Spring. When wolves begin to give milk again.", icon: "fas fa-dog", date: { year: 0, month: 1, day: 1 }, repeatUnit: "years", repeatInterval: 1, repeatCount: 0, isPreset: true },
            { title: "Ostara (Spring Equinox)", content: "Spring has arrived! New life sprouts; fertility abounds.", icon: "fas fa-seedling", date: { year: 0, month: 2, day: 15 }, repeatUnit: "years", repeatInterval: 1, repeatCount: 0, isPreset: true },
            { title: "Beltane", content: "Festival of Fire. Bonfires representing life and maypole dancing.", icon: "fas fa-fire", date: { year: 0, month: 4, day: 0 }, repeatUnit: "years", repeatInterval: 1, repeatCount: 0, isPreset: true },
            { title: "BLOOD MOON", content: "The Morninglord's Tears. A 5-day period where the moon sits large and red. Terrible thunderstorms plague the valley.", icon: "fas fa-cloud-bolt", date: { year: 0, month: 5, day: 14 }, repeatUnit: "years", repeatInterval: 1, repeatCount: 0, isPreset: true },
            { title: "Litha (Summer Solstice)", content: "Midsummer celebration. Longest day of the year.", icon: "fas fa-sun", date: { year: 0, month: 5, day: 21 }, repeatUnit: "years", repeatInterval: 1, repeatCount: 0, isPreset: true },
            { title: "Lughnasadh", content: "First Harvest. Gratitude for bread and fresh fruits.", icon: "fas fa-wheat", date: { year: 0, month: 7, day: 0 }, repeatUnit: "years", repeatInterval: 1, repeatCount: 0, isPreset: true },
            { title: "Mabon (Autumn Equinox)", content: "Reaping of the harvest.", icon: "fas fa-leaf", date: { year: 0, month: 8, day: 22 }, repeatUnit: "years", repeatInterval: 1, repeatCount: 0, isPreset: true },
            { title: "Samhain", content: "Witches' New Year. Veil between worlds is thin.", icon: "fas fa-ghost", date: { year: 0, month: 9, day: 29 }, repeatUnit: "years", repeatInterval: 1, repeatCount: 0, isPreset: true },
            { title: "Yule (Winter Solstice)", content: "Longest night of the year.", icon: "fas fa-snowflake", date: { year: 0, month: 11, day: 19 }, repeatUnit: "years", repeatInterval: 1, repeatCount: 0, isPreset: true },
            { title: "New Year's Eve", content: "Final preparations for the new cycle.", icon: "fas fa-hourglass-end", date: { year: 0, month: 11, day: 29 }, repeatUnit: "years", repeatInterval: 1, repeatCount: 0, isPreset: true }
        ],
        sun: {
            values: [
                { dawn: 9, dusk: 17, monthStart: 1, monthEnd: 1 },
                { dawn: 8, dusk: 18, monthStart: 2, monthEnd: 2 },
                { dawn: 7, dusk: 18, monthStart: 3, monthEnd: 3 },
                { dawn: 7, dusk: 18, monthStart: 4, monthEnd: 4 },
                { dawn: 7, dusk: 18, monthStart: 5, monthEnd: 5 },
                { dawn: 7, dusk: 18, monthStart: 6, monthEnd: 6 },
                { dawn: 7, dusk: 18, monthStart: 7, monthEnd: 7 },
                { dawn: 7, dusk: 18, monthStart: 8, monthEnd: 8 },
                { dawn: 7, dusk: 18, monthStart: 9, monthEnd: 9 },
                { dawn: 7, dusk: 18, monthStart: 10, monthEnd: 10 },
                { dawn: 8, dusk: 18, monthStart: 11, monthEnd: 11 },
                { dawn: 9, dusk: 17, monthStart: 12, monthEnd: 12 }
            ]
        }
    };
}


export function galifar() {
    return {
        name: "Galifar Calendar",
        id: "galifar-calendar",
        description: "The primary calendar system used on the continent of Khorvaire (Eberron).",
        years: {
            yearZero: 0,
            firstWeekday: 0,
            leapYear: {
                leapStart: 0,
                leapInterval: 0
            }
        },
        months: {
            values: [
                { name: "Zarantyr", abbreviation: "Zar", ordinal: 1, days: 28 },
                { name: "Olarune", abbreviation: "Ola", ordinal: 2, days: 28 },
                { name: "Therendor", abbreviation: "The", ordinal: 3, days: 28 },
                { name: "Eyre", abbreviation: "Eyr", ordinal: 4, days: 28 },
                { name: "Dravago", abbreviation: "Dra", ordinal: 5, days: 28 },
                { name: "Nymm", abbreviation: "Nym", ordinal: 6, days: 28 },
                { name: "Lharvion", abbreviation: "Lha", ordinal: 7, days: 28 },
                { name: "Barrakas", abbreviation: "Bar", ordinal: 8, days: 28 },
                { name: "Rhaan", abbreviation: "Rha", ordinal: 9, days: 28 },
                { name: "Sypheros", abbreviation: "Syp", ordinal: 10, days: 28 },
                { name: "Aryth", abbreviation: "Ary", ordinal: 11, days: 28 },
                { name: "Vult", abbreviation: "Vul", ordinal: 12, days: 28 }
            ]
        },
        days: {
            values: [
                { name: "Sul", abbreviation: "Su", ordinal: 1 },
                { name: "Mol", abbreviation: "Mo", ordinal: 2 },
                { name: "Zol", abbreviation: "Zo", ordinal: 3 },
                { name: "Wir", abbreviation: "Wi", ordinal: 4 },
                { name: "Zor", abbreviation: "Zr", ordinal: 5 },
                { name: "Far", abbreviation: "Fa", ordinal: 6 },
                { name: "Sar", abbreviation: "Sa", ordinal: 7 }
            ],
            daysPerYear: 336,
            hoursPerDay: 24,
            minutesPerHour: 60,
            secondsPerMinute: 60
        },
        seasons: {
            values: [
                { name: "Winter", monthStart: 12, monthEnd: 2 },
                { name: "Spring", monthStart: 3, monthEnd: 5 },
                { name: "Summer", monthStart: 6, monthEnd: 8 },
                { name: "Autumn", monthStart: 9, monthEnd: 11 }
            ]
        },
        weather: {
            values: [
                { name: "Winter", monthStart: 12, monthEnd: 2, tempOffset: -15 },
                { name: "Spring", monthStart: 3, monthEnd: 5, tempOffset: 0 },
                { name: "Summer", monthStart: 6, monthEnd: 8, tempOffset: 20 },
                { name: "Autumn", monthStart: 9, monthEnd: 11, tempOffset: 5 }
            ]
        },
        notes: [
            {
                title: "Founding of Galifar",
                content: "The founding of the kingdom of Galifar by Galifar ir'Wynarn I.",
                icon: "fas fa-crown",
                date: {
                    year: 1,
                    month: 0,
                    day: 0
                },
                repeatUnit: "none",
                repeatInterval: 0,
                repeatCount: 0,
                isPreset: true
            },
            {
                title: "Start of the Last War",
                content: "The start of the Last War, ending the kingdom of Galifar.",
                icon: "fas fa-shield-alt",
                date: {
                    year: 894,
                    month: 0,
                    day: 0
                },
                repeatUnit: "none",
                repeatInterval: 0,
                repeatCount: 0,
                isPreset: true
            },
            {
                title: "Day of Mourning",
                content: "The year the Day of Mourning occurred, destroying Cyre.",
                icon: "fas fa-skull",
                date: {
                    year: 994,
                    month: 1,
                    day: 19
                },
                repeatUnit: "none",
                repeatInterval: 0,
                repeatCount: 0,
                isPreset: true
            },
            {
                title: "Present Day",
                content: "The default starting year for Eberron campaigns.",
                icon: "fas fa-flag",
                date: {
                    year: 998,
                    month: 0,
                    day: 0
                },
                repeatUnit: "none",
                repeatInterval: 0,
                repeatCount: 0,
                isPreset: true
            }
        ]
    };
}

export function warhammer() {
    return {
        name: "Imperial Calendar",
        id: "whf calendar",
        description: "The standard calendar of the Empire of Man.",
        years: {
            yearZero: 0,
            firstWeekday: 0,
            leapYear: {
                leapStart: 0,
                leapInterval: 0
            }
        },
        months: {
            values: [
                {
                    name: "Hexenstag",
                    abbreviation: "Heg",
                    ordinal: 1,
                    days: 1,
                    intercalary: true
                },
                {
                    name: "Nachexen",
                    abbreviation: "Nac",
                    ordinal: 1,
                    days: 32
                },
                {
                    name: "Jahrdrung",
                    abbreviation: "Jar",
                    ordinal: 2,
                    days: 33
                },
                {
                    name: "Mitterfruhl",
                    abbreviation: "Mit",
                    ordinal: 3,
                    days: 1,
                    intercalary: true
                },
                {
                    name: "Pflugzeit",
                    abbreviation: "Pfl",
                    ordinal: 3,
                    days: 33
                },
                {
                    name: "Sigmarzeit",
                    abbreviation: "Sig",
                    ordinal: 4,
                    days: 33
                },
                {
                    name: "Sommerzeit",
                    abbreviation: "Som",
                    ordinal: 5,
                    days: 33
                },
                {
                    name: "Sonnstill",
                    abbreviation: "Son",
                    ordinal: 6,
                    days: 1,
                    intercalary: true
                },
                {
                    name: "Vorgeheim",
                    abbreviation: "Vor",
                    ordinal: 6,
                    days: 33
                },
                {
                    name: "Geheimnistag",
                    abbreviation: "Geh",
                    ordinal: 7,
                    days: 1,
                    intercalary: true
                },
                {
                    name: "Nachgeheim",
                    abbreviation: "Nah",
                    ordinal: 7,
                    days: 32
                },
                {
                    name: "Erntezeit",
                    abbreviation: "Ern",
                    ordinal: 8,
                    days: 33
                },
                {
                    name: "Mittherbst",
                    abbreviation: "Mib",
                    ordinal: 9,
                    days: 1,
                    intercalary: true
                },
                {
                    name: "Brauzeit",
                    abbreviation: "Bra",
                    ordinal: 9,
                    days: 33
                },
                {
                    name: "Kaldezeit",
                    abbreviation: "Kal",
                    ordinal: 10,
                    days: 33
                },
                {
                    name: "Ulriczeit",
                    abbreviation: "Ulr",
                    ordinal: 11,
                    days: 33
                },
                {
                    name: "Mondstille",
                    abbreviation: "Mon",
                    ordinal: 12,
                    days: 1,
                    intercalary: true
                },
                {
                    name: "Vorhexen",
                    abbreviation: "Voh",
                    ordinal: 12,
                    days: 33
                }
            ]
        },
        days: {
            values: [
                {
                    name: "Wellentag",
                    ordinal: 1
                },
                {
                    name: "Aubentag",
                    ordinal: 2
                },
                {
                    name: "Marktag",
                    ordinal: 3
                },
                {
                    name: "Backertag",
                    ordinal: 4
                },
                {
                    name: "Bezahltag",
                    ordinal: 5
                },
                {
                    name: "Konistag",
                    ordinal: 6
                },
                {
                    name: "Angestag",
                    ordinal: 7
                },
                {
                    name: "Festag",
                    ordinal: 8
                }
            ],
            daysPerYear: 400,
            hoursPerDay: 24,
            minutesPerHour: 60,
            secondsPerMinute: 60
        },
        moons: {
            values: [
                {
                    name: "Mannslieb",
                    cycleLength: 25,
                    offset: 0,
                    phases: [
                        {
                            name: "New Moon",
                            display: "New Moon",
                            length: 1,
                            icon: "fa-moon"
                        },
                        {
                            name: "Waxing Crescent",
                            display: "Waxing Crescent",
                            length: 5,
                            icon: "fa-moon"
                        },
                        {
                            name: "First Quarter",
                            display: "First Quarter",
                            length: 1,
                            icon: "fa-moon"
                        },
                        {
                            name: "Waxing Gibbous",
                            display: "Waxing Gibbous",
                            length: 5,
                            icon: "fa-moon"
                        },
                        {
                            name: "Full Moon",
                            display: "Full Moon",
                            length: 1,
                            icon: "fa-moon"
                        },
                        {
                            name: "Waning Gibbous",
                            display: "Waning Gibbous",
                            length: 5,
                            icon: "fa-moon"
                        },
                        {
                            name: "Last Quarter",
                            display: "Last Quarter",
                            length: 1,
                            icon: "fa-moon"
                        },
                        {
                            name: "Waning Crescent",
                            display: "Waning Crescent",
                            length: 6,
                            icon: "fa-moon"
                        }
                    ],
                    color: "#e0e0e0",
                    firstNewMoon: {
                        year: 0,
                        month: 2,
                        day: 1
                    }
                },
                {
                    name: "Morrslieb",
                    cycleLength: 33,
                    offset: 0,
                    phases: [
                        {
                            name: "New Moon",
                            length: 3,
                            icon: "fa-moon"
                        },
                        {
                            name: "Waxing Crescent",
                            length: 7,
                            icon: "fa-moon"
                        },
                        {
                            name: "First Quarter",
                            length: 2,
                            icon: "fa-adjust"
                        },
                        {
                            name: "Waxing Gibbous",
                            length: 6,
                            icon: "fa-moon"
                        },
                        {
                            name: "Full Moon",
                            length: 3,
                            icon: "fa-circle"
                        },
                        {
                            name: "Waning Gibbous",
                            length: 6,
                            icon: "fa-moon"
                        },
                        {
                            name: "Last Quarter",
                            length: 2,
                            icon: "fa-adjust fa-flip-horizontal"
                        },
                        {
                            name: "Waning Crescent",
                            length: 4,
                            icon: "fa-moon"
                        }
                    ],
                    color: "#9db92c",
                    firstNewMoon: {
                        year: 0,
                        month: 2,
                        day: 7
                    }
                }
            ]
        },
        sun: {
            values: [
                {
                    dawn: 6,
                    dusk: 18,
                    monthStart: 2,
                    monthEnd: 4
                },
                {
                    dawn: 6,
                    dusk: 19,
                    monthStart: 5,
                    monthEnd: 7
                },
                {
                    dawn: 7,
                    dusk: 18,
                    monthStart: 8,
                    monthEnd: 9
                },
                {
                    dawn: 8,
                    dusk: 17,
                    monthStart: 10,
                    monthEnd: 1
                }
            ]
        },
        seasons: {
            values: [
                {
                    name: "Spring",
                    monthStart: 2,
                    monthEnd: 4
                },
                {
                    name: "Summer",
                    monthStart: 5,
                    monthEnd: 7
                },
                {
                    name: "Autumn",
                    monthStart: 8,
                    monthEnd: 9
                },
                {
                    name: "Winter",
                    monthStart: 10,
                    monthEnd: 1
                }
            ]
        }
    };
}

export function harptos() {
    return {
        name: "Harptos (Forgotten Realms)",
        id: "harptos-preset",
        description: "The standard calendar of the Forgotten Realms.",
        years: {
            yearZero: 0,
            resetWeekdays: true,
            firstWeekday: 0,
            leapYear: {
                leapStart: 0,
                leapInterval: 4,
            },
        },
        months: {
            values: [
                {
                    name: "Hammer",
                    abbreviation: "Ham",
                    ordinal: 1,
                    days: 30,
                },
                {
                    name: "Midwinter",
                    abbreviation: "Mid",
                    ordinal: 1,
                    days: 1,
                },
                {
                    name: "Alturiak",
                    abbreviation: "Alt",
                    ordinal: 2,
                    days: 30,
                },
                {
                    name: "Ches",
                    abbreviation: "Che",
                    ordinal: 3,
                    days: 30,
                },
                {
                    name: "Tarsakh",
                    abbreviation: "Tar",
                    ordinal: 4,
                    days: 30,
                },
                {
                    name: "Greengrass",
                    abbreviation: "Gre",
                    ordinal: 4,
                    days: 1,
                },
                {
                    name: "Mirtul",
                    abbreviation: "Mir",
                    ordinal: 5,
                    days: 30,
                },
                {
                    name: "Kythorn",
                    abbreviation: "Kyt",
                    ordinal: 6,
                    days: 30,
                },
                {
                    name: "Flamerule",
                    abbreviation: "Fla",
                    ordinal: 7,
                    days: 30,
                },
                {
                    name: "Midsummer",
                    abbreviation: "MidS",
                    ordinal: 7,
                    days: 1,
                },
                {
                    name: "Shieldmeet",
                    abbreviation: "Shi",
                    ordinal: 7,
                    days: 0,
                    leapDays: 1,
                },
                {
                    name: "Eleasis",
                    abbreviation: "Ele",
                    ordinal: 8,
                    days: 30,
                },
                {
                    name: "Eleint",
                    abbreviation: "Eli",
                    ordinal: 9,
                    days: 30,
                },
                {
                    name: "Highharvestide",
                    abbreviation: "Hig",
                    ordinal: 9,
                    days: 1,
                },
                {
                    name: "Marpenoth",
                    abbreviation: "Mar",
                    ordinal: 10,
                    days: 30,
                },
                {
                    name: "Uktar",
                    abbreviation: "Ukt",
                    ordinal: 11,
                    days: 30,
                },
                {
                    name: "Feast of the Moon",
                    abbreviation: "Fea",
                    ordinal: 11,
                    days: 1,
                },
                {
                    name: "Nightal",
                    abbreviation: "Nig",
                    ordinal: 12,
                    days: 30,
                },
            ],
        },
        days: {
            values: [
                {
                    name: "First-day",
                    abbreviation: "1d",
                    ordinal: 1,
                },
                {
                    name: "Second-day",
                    abbreviation: "2d",
                    ordinal: 2,
                },
                {
                    name: "Third-day",
                    abbreviation: "3d",
                    ordinal: 3,
                },
                {
                    name: "Fourth-day",
                    abbreviation: "4d",
                    ordinal: 4,
                },
                {
                    name: "Fifth-day",
                    abbreviation: "5d",
                    ordinal: 5,
                },
                {
                    name: "Sixth-day",
                    abbreviation: "6d",
                    ordinal: 6,
                },
                {
                    name: "Seventh-day",
                    abbreviation: "7d",
                    ordinal: 7,
                },
                {
                    name: "Eighth-day",
                    abbreviation: "8d",
                    ordinal: 8,
                },
                {
                    name: "Ninth-day",
                    abbreviation: "9d",
                    ordinal: 9,
                },
                {
                    name: "Tenth-day",
                    abbreviation: "10d",
                    ordinal: 10,
                },
            ],
            daysPerYear: 365,
            hoursPerDay: 24,
            minutesPerHour: 60,
            secondsPerMinute: 60,
        },
        moons: {
            values: [
                {
                    name: "Selûne",
                    cycleLength: 30.4375,
                    offset: 0,
                    phases: [
                        {
                            name: "New Moon",
                            display: "New Moon",
                            length: 3.8,
                            icon: "fa-moon",
                        },
                        {
                            name: "Waxing Crescent",
                            display: "Waxing Crescent",
                            length: 3.8,
                            icon: "fa-moon",
                        },
                        {
                            name: "First Quarter",
                            display: "First Quarter",
                            length: 3.8,
                            icon: "fa-adjust",
                        },
                        {
                            name: "Waxing Gibbous",
                            display: "Waxing Gibbous",
                            length: 3.8,
                            icon: "fa-moon",
                        },
                        {
                            name: "Full Moon",
                            display: "Full Moon",
                            length: 3.8,
                            icon: "fa-circle",
                        },
                        {
                            name: "Waning Gibbous",
                            display: "Waning Gibbous",
                            length: 3.8,
                            icon: "fa-moon",
                        },
                        {
                            name: "Last Quarter",
                            display: "Last Quarter",
                            length: 3.8,
                            icon: "fa-adjust fa-flip-horizontal",
                        },
                        {
                            name: "Waning Crescent",
                            display: "Waning Crescent",
                            length: 3.8,
                            icon: "fa-moon",
                        },
                    ],
                    color: "#e0e0e0",
                    firstNewMoon: {
                        year: 1,
                        month: 1,
                        day: 1,
                    },
                },
            ],
        },
        sun: {
            values: [
                {
                    dawn: 8,
                    dusk: 16,
                    monthStart: 1,
                    monthEnd: 2
                },
                {
                    dawn: 6,
                    dusk: 18,
                    monthStart: 3,
                    monthEnd: 5
                },
                {
                    dawn: 5,
                    dusk: 20,
                    monthStart: 6,
                    monthEnd: 8
                },
                {
                    dawn: 6,
                    dusk: 18,
                    monthStart: 9,
                    monthEnd: 11
                },
                {
                    dawn: 8,
                    dusk: 16,
                    monthStart: 12,
                    monthEnd: 12
                }
            ]
        },
        notes: [
            {
                title: "Midwinter",
                content: "Midwinter (also known as Deadwinter Day) was a festival to mark the midpoint of winter.",
                icon: "fas fa-snowflake",
                date: { year: 0, month: 1, day: 0 },
                repeatUnit: "years",
                repeatInterval: 1,
                repeatCount: 0,
                isPreset: true
            },
            {
                title: "Spring Equinox",
                content: "The first day of spring.",
                icon: "fas fa-seedling",
                date: { year: 0, month: 3, day: 18 },
                repeatUnit: "years",
                repeatInterval: 1,
                repeatCount: 0,
                isPreset: true
            },
            {
                title: "Greengrass",
                content: "Greengrass is a festival to welcome in the first day of spring.",
                icon: "fas fa-leaf",
                date: { year: 0, month: 5, day: 0 },
                repeatUnit: "years",
                repeatInterval: 1,
                repeatCount: 0,
                isPreset: true
            },
            {
                title: "Summer Solstice",
                content: "The longest day of the year.",
                icon: "fas fa-sun",
                date: { year: 0, month: 7, "day": 19 },
                repeatUnit: "years",
                repeatInterval: 1,
                repeatCount: 0,
                isPreset: true
            },
            {
                title: "Midsummer",
                content: "Midsummer is a festival that celebrated love and music through feast.",
                icon: "fas fa-wine-glass-alt",
                date: { year: 0, month: 9, day: 0 },
                repeatUnit: "years",
                repeatInterval: 1,
                repeatCount: 0,
                isPreset: true
            },
            {
                title: "Shieldmeet",
                content: "A leap year festival occurring once every four years.",
                icon: "fas fa-shield-alt",
                date: { year: 0, month: 10, day: 0 },
                repeatUnit: "years",
                repeatInterval: 1,
                repeatCount: 0,
                isPreset: true
            },
            {
                title: "Autumn Equinox",
                content: "The changing of the seasons to autumn.",
                icon: "fas fa-balance-scale",
                date: { year: 0, month: 12, day: 20 },
                repeatUnit: "years",
                repeatInterval: 1,
                repeatCount: 0,
                isPreset: true
            },
            {
                title: "Highharvestide",
                content: "A feast to celebrate the harvest.",
                icon: "fas fa-wheat",
                date: { year: 0, month: 13, day: 0 },
                repeatUnit: "years",
                repeatInterval: 1,
                repeatCount: 0,
                isPreset: true
            },
            {
                title: "Feast of the Moon",
                content: "A festival honoring the ancestors and the dead.",
                icon: "fas fa-moon",
                date: { year: 0, month: 16, day: 0 },
                repeatUnit: "years",
                repeatInterval: 1,
                repeatCount: 0,
                isPreset: true
            },
            {
                title: "Winter Solstice",
                content: "The shortest day of the year.",
                icon: "fas fa-star",
                date: { year: 0, month: 17, day: 19 },
                repeatUnit: "years",
                repeatInterval: 1,
                repeatCount: 0,
                isPreset: true
            }
        ],
        seasons: {
            values: [
                {
                    name: "Deepwinter",
                    monthStart: 1,
                    monthEnd: 1,
                },
                {
                    name: "The Claw of Winter",
                    monthStart: 2,
                    monthEnd: 2,
                },
                {
                    name: "The Claw of Sunsets",
                    monthStart: 3,
                    monthEnd: 3,
                },
                {
                    name: "The Claw of Storms",
                    monthStart: 4,
                    monthEnd: 4,
                },
                {
                    name: "The Melting",
                    monthStart: 5,
                    monthEnd: 5,
                },
                {
                    name: "The Time of Flowers",
                    monthStart: 6,
                    monthEnd: 6,
                },
                {
                    name: "Summertide",
                    monthStart: 7,
                    monthEnd: 7,
                },
                {
                    name: "Highsun",
                    monthStart: 8,
                    monthEnd: 8,
                },
                {
                    name: "The Fading",
                    monthStart: 9,
                    monthEnd: 9,
                },
                {
                    name: "Leaffall",
                    monthStart: 10,
                    monthEnd: 10,
                },
                {
                    name: "The Rotting",
                    monthStart: 11,
                    monthEnd: 11,
                },
                {
                    name: "The Drawing Down",
                    monthStart: 12,
                    monthEnd: 12,
                },
            ],
        },
        weather: {
            values: [
                { name: "Winter", monthStart: 1, monthEnd: 2, tempOffset: -10 },
                { name: "Spring", monthStart: 3, monthEnd: 5, tempOffset: 0 },
                { name: "Summer", monthStart: 6, monthEnd: 8, tempOffset: 15 },
                { name: "Autumn", monthStart: 9, monthEnd: 11, tempOffset: 5 },
                { name: "Winter", monthStart: 12, monthEnd: 12, tempOffset: -10 }
            ]
        }
    };
}


export function pf2e() {
    return {
        name: "Absalom Reckoning",
        id: "Absalom Reckoning PF2E",
        description: "Absalom Reckoning for PF2E (Golarion)",
        years: {
            yearZero: 2700,
            firstWeekday: 0,
            leapYear: {
                leapStart: 0,
                leapInterval: 4 // Every 4 years
            }
        },
        months: {
            values: [
                { name: "Abadius", abbreviation: "Aba", ordinal: 1, days: 31 },
                { name: "Calistril", abbreviation: "Cal", ordinal: 2, days: 28, leapDays: 29 }, // Leap day adds here
                { name: "Pharast", abbreviation: "Phar", ordinal: 3, days: 31 },
                { name: "Gozran", abbreviation: "Goz", ordinal: 4, days: 30 },
                { name: "Desnus", abbreviation: "Des", ordinal: 5, days: 31 },
                { name: "Sarenith", abbreviation: "Sar", ordinal: 6, days: 30 },
                { name: "Erastus", abbreviation: "Eras", ordinal: 7, days: 31 },
                { name: "Arodus", abbreviation: "Aro", ordinal: 8, days: 31 },
                { name: "Rova", abbreviation: "Rov", ordinal: 9, days: 30 },
                { name: "Lamashan", abbreviation: "Lam", ordinal: 10, days: 31 },
                { name: "Neth", abbreviation: "Neth", ordinal: 11, days: 30 },
                { name: "Kuthona", abbreviation: "Kuth", ordinal: 12, days: 31 }
            ]
        },
        days: {
            values: [
                { name: "Moonday", abbreviation: "Mo", ordinal: 1, isRestDay: false },
                { name: "Toilday", abbreviation: "To", ordinal: 2, isRestDay: false },
                { name: "Wealday", abbreviation: "We", ordinal: 3, isRestDay: false },
                { name: "Oathday", abbreviation: "Oa", ordinal: 4, isRestDay: false },
                { name: "Fireday", abbreviation: "Fi", ordinal: 5, isRestDay: false },
                { name: "Starday", abbreviation: "Sa", ordinal: 6, isRestDay: false },
                { name: "Sunday", abbreviation: "Su", ordinal: 7, isRestDay: true }
            ],
            daysPerYear: 365,
            hoursPerDay: 24,
            minutesPerHour: 60,
            secondsPerMinute: 60
        },
        moons: {
            values: [
                {
                    name: "Somal",
                    cycleLength: 29.5,
                    offset: 0,
                    color: "#e0e0e0",
                    firstNewMoon: { year: 0, month: 1, day: 26 },
                    phases: [
                        { name: "New Moon", display: "New Moon", length: 3.6875, icon: "fa-moon" },
                        { name: "Waxing Crescent", display: "Waxing Crescent", length: 3.6875, icon: "fa-moon" },
                        { name: "First Quarter", display: "First Quarter", length: 3.6875, icon: "fa-moon" },
                        { name: "Waxing Gibbous", display: "Waxing Gibbous", length: 3.6875, icon: "fa-moon" },
                        { name: "Full Moon", display: "Full Moon", length: 3.6875, icon: "fa-moon" },
                        { name: "Waning Gibbous", display: "Waning Gibbous", length: 3.6875, icon: "fa-moon" },
                        { name: "Last Quarter", display: "Last Quarter", length: 3.6875, icon: "fa-moon" },
                        { name: "Waning Crescent", display: "Waning Crescent", length: 3.6875, icon: "fa-moon" }
                    ]
                }
            ]
        },
        sun: {
            values: [
                { dawn: 8, dusk: 16, monthStart: 1, monthEnd: 2 },
                { dawn: 6, dusk: 18, monthStart: 3, monthEnd: 5 },
                { dawn: 5, dusk: 20, monthStart: 6, monthEnd: 8 },
                { dawn: 6, dusk: 18, monthStart: 9, monthEnd: 11 },
                { dawn: 8, dusk: 16, monthStart: 12, monthEnd: 12 }
            ]
        },
        seasons: {
            values: [
                { name: "Winter", monthStart: 1, monthEnd: 2 },
                { name: "Spring", monthStart: 3, monthEnd: 5 },
                { name: "Summer", monthStart: 6, monthEnd: 8 },
                { name: "Autumn", monthStart: 9, monthEnd: 11 },
                { name: "Winter", monthStart: 12, monthEnd: 12 }
            ]
        },
        notes: [
            {
                title: "Foundation of Absalom",
                content: "The god Aroden lifts the Starstone from the depths of the Inner Sea.",
                icon: "fas fa-archway",
                date: { year: 1, month: 1, day: 1 },
                repeatUnit: "years",
                repeatInterval: 1,
                repeatCount: 0,
                isPreset: true
            },
            {
                title: "New Year",
                content: "First day of the year.",
                icon: "fas fa-glass-cheers",
                date: { year: 0, month: 0, day: 0 },
                repeatUnit: "years",
                repeatInterval: 1,
                repeatCount: 0,
                isPreset: true
            }
        ]
    };
}

export function gregorian() {
    return {
        name: "Simplified Gregorian",
        id: "gregorian-preset",
        description: "The Gregorian calendar with simplified leap years.",
        years: {
            yearZero: 0,
            firstWeekday: 5,
            leapYear: { leapStart: 0, leapInterval: 4 },
        },
        months: {
            values: [
                {
                    name: "CALENDAR.GREGORIAN.January",
                    abbreviation: "CALENDAR.GREGORIAN.JanuaryAbbr",
                    ordinal: 1,
                    days: 31,
                },
                {
                    name: "CALENDAR.GREGORIAN.February",
                    abbreviation: "CALENDAR.GREGORIAN.FebruaryAbbr",
                    ordinal: 2,
                    days: 28,
                    leapDays: 29,
                },
                {
                    name: "CALENDAR.GREGORIAN.March",
                    abbreviation: "CALENDAR.GREGORIAN.MarchAbbr",
                    ordinal: 3,
                    days: 31,
                },
                {
                    name: "CALENDAR.GREGORIAN.April",
                    abbreviation: "CALENDAR.GREGORIAN.AprilAbbr",
                    ordinal: 4,
                    days: 30,
                },
                {
                    name: "CALENDAR.GREGORIAN.May",
                    abbreviation: "CALENDAR.GREGORIAN.MayAbbr",
                    ordinal: 5,
                    days: 31,
                },
                {
                    name: "CALENDAR.GREGORIAN.June",
                    abbreviation: "CALENDAR.GREGORIAN.JuneAbbr",
                    ordinal: 6,
                    days: 30,
                },
                {
                    name: "CALENDAR.GREGORIAN.July",
                    abbreviation: "CALENDAR.GREGORIAN.JulyAbbr",
                    ordinal: 7,
                    days: 31,
                },
                {
                    name: "CALENDAR.GREGORIAN.August",
                    abbreviation: "CALENDAR.GREGORIAN.AugustAbbr",
                    ordinal: 8,
                    days: 31,
                },
                {
                    name: "CALENDAR.GREGORIAN.September",
                    abbreviation: "CALENDAR.GREGORIAN.SeptemberAbbr",
                    ordinal: 9,
                    days: 30,
                },
                {
                    name: "CALENDAR.GREGORIAN.October",
                    abbreviation: "CALENDAR.GREGORIAN.OctoberAbbr",
                    ordinal: 10,
                    days: 31,
                },
                {
                    name: "CALENDAR.GREGORIAN.November",
                    abbreviation: "CALENDAR.GREGORIAN.NovemberAbbr",
                    ordinal: 11,
                    days: 30,
                },
                {
                    name: "CALENDAR.GREGORIAN.December",
                    abbreviation: "CALENDAR.GREGORIAN.DecemberAbbr",
                    ordinal: 12,
                    days: 31,
                },
            ],
        },
        days: {
            values: [
                { name: "CALENDAR.GREGORIAN.Monday", abbreviation: "CALENDAR.GREGORIAN.MondayAbbr", ordinal: 1 },
                { name: "CALENDAR.GREGORIAN.Tuesday", abbreviation: "CALENDAR.GREGORIAN.TuesdayAbbr", ordinal: 2 },
                {
                    name: "CALENDAR.GREGORIAN.Wednesday",
                    abbreviation: "CALENDAR.GREGORIAN.WednesdayAbbr",
                    ordinal: 3,
                },
                {
                    name: "CALENDAR.GREGORIAN.Thursday",
                    abbreviation: "CALENDAR.GREGORIAN.ThursdayAbbr",
                    ordinal: 4,
                },
                { name: "CALENDAR.GREGORIAN.Friday", abbreviation: "CALENDAR.GREGORIAN.FridayAbbr", ordinal: 5 },
                {
                    name: "CALENDAR.GREGORIAN.Saturday",
                    abbreviation: "CALENDAR.GREGORIAN.SaturdayAbbr",
                    ordinal: 6,
                    isRestDay: true,
                },
                {
                    name: "CALENDAR.GREGORIAN.Sunday",
                    abbreviation: "CALENDAR.GREGORIAN.SundayAbbr",
                    ordinal: 7,
                    isRestDay: true,
                },
            ],
            daysPerYear: 365,
            hoursPerDay: 24,
            minutesPerHour: 60,
            secondsPerMinute: 60,
        },
        moons: {
            values: [
                {
                    name: "Luna",
                    cycleLength: 29.53,
                    offset: 4,
                    phases: [
                        { name: "New Moon", display: "New Moon", length: 3.69, icon: "fa-moon" },
                        { name: "Waxing Crescent", display: "Waxing Crescent", length: 3.69, icon: "fa-moon" },
                        { name: "First Quarter", display: "First Quarter", length: 3.69, icon: "fa-moon" },
                        { name: "Waxing Gibbous", display: "Waxing Gibbous", length: 3.69, icon: "fa-moon" },
                        { name: "Full Moon", display: "Full Moon", length: 3.69, icon: "fa-moon" },
                        { name: "Waning Gibbous", display: "Waning Gibbous", length: 3.69, icon: "fa-moon" },
                        { name: "Last Quarter", display: "Last Quarter", length: 3.69, icon: "fa-moon" },
                        { name: "Waning Crescent", display: "Waning Crescent", length: 3.69, icon: "fa-moon" },
                    ],
                    color: "#f4f4f4",
                    firstNewMoon: { year: 0, month: 1, day: 1 },
                },
            ],
        },
        seasons: {
            values: [
                { name: "CALENDAR.GREGORIAN.Spring", monthStart: 3, monthEnd: 5 },
                { name: "CALENDAR.GREGORIAN.Summer", monthStart: 6, monthEnd: 8 },
                { name: "CALENDAR.GREGORIAN.Fall", monthStart: 9, monthEnd: 11 },
                { name: "CALENDAR.GREGORIAN.Winter", monthStart: 12, monthEnd: 2 },
            ],
        },
    };
}

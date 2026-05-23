(function () {
    'use strict';

    // Source: Siaya County Village Administrative Units Act, 2020, Schedule:
    // "List of Village Units" by sub-county, ward, sub-locations, and village unit.
    const hierarchy = {
        'Central Alego': [
            { name: 'Ojuando A / Ojuando B', villages: ['Ojwando'] },
            { name: 'Kochieng A / Kochieng B', villages: ['Kochieng'] },
            { name: 'Koyeyo / Kakumu Kombewa', villages: ['Koyeyo-Kakumu Kombewa'] },
            { name: 'Kadenge / Obambo', villages: ['Kadenge-Obambo Village'] }
        ],
        'North Alego': [
            { name: 'Komolo / Hono', villages: ['Kowet'] },
            { name: 'Nyamila / Nyalgunga', villages: ['Nyalgunga'] },
            { name: 'Ulafu / Umala / Ulwa', villages: ['Umala'] }
        ],
        'Siaya Township': [
            { name: 'Nyandiwa / Muhala', villages: ['Nyandiwa'] },
            { name: 'Karapul', villages: ['Karapul'] }
        ],
        'South East Alego': [
            { name: 'Bar Olengo / Mur Malanga', villages: ['Bar Olengo'] },
            { name: 'Nyajuok', villages: ['Nyajuok'] },
            { name: 'Bar Agulu / Barding', villages: ['Barding'] },
            { name: 'Randago / Bar Osimbo', villages: ['Randago'] },
            { name: 'Nyangoma / Pap Oriang', villages: ['Nyangoma'] },
            { name: 'Masumbi / Mur Ngiya', villages: ['Ngiya'] }
        ],
        'Usonga': [
            { name: 'Nyadorera A / Nyadorera B', villages: ['Nyadorera'] },
            { name: 'Sumba', villages: ['Sumba'] }
        ],
        'West Alego': [
            { name: 'Gangu / Kaugagi Hawinga / Kaugagi Udenda', villages: ['Kaugagi'] },
            { name: 'Sigoma Uranga / Kabura Uhuyi', villages: ['Sigoma'] },
            { name: 'Kalkada Uradi / Komenya Kowala / Komenya Kalaka', villages: ['Komenya'] },
            { name: 'Kodiera / Mahola Ulawe', villages: ['Mahola'] }
        ],
        'Central Sakwa': [
            { name: 'Ndeda / Oyamo', villages: ['Oyamo'] },
            { name: 'Nyangoma', villages: ['Nyangoma'] },
            { name: 'Uyawi', villages: ['Uyawi'] }
        ],
        'North Sakwa': [
            { name: 'Abom / Barchando', villages: ['Abom'] },
            { name: 'Ajigo', villages: ['Ajigo'] },
            { name: 'Bar Kowino East / Bar Kowino West', villages: ['Bar Kowino'] }
        ],
        'West Sakwa': [
            { name: 'Utonga / Kapiyo', villages: ['Kapiyo'] },
            { name: 'Usire / Maranda', villages: ['Maranda'] },
            { name: 'Nyawita', villages: ['Nyawita'] }
        ],
        'West Yimbo': [
            { name: 'Usenge / Otuoma', villages: ['Usenge'] },
            { name: 'Mahanga / Mutundu', villages: ['Mageta'] },
            { name: 'Got Agulu', villages: ['Got Agulu'] }
        ],
        'South Sakwa': [
            { name: 'Migwena East / Migwena West', villages: ['Migwena'] },
            { name: 'Nyaguda', villages: ['Nyaguda'] },
            { name: 'Got Abiero', villages: ['Got Abiero'] }
        ],
        'Yimbo East': [
            { name: 'Usigu / Got Ramogi', villages: ['Usigu'] },
            { name: 'Bar Kanyango', villages: ['Bar Kanyango'] },
            { name: 'Othach', villages: ['Othach'] },
            { name: 'Pala', villages: ['Pala'] },
            { name: 'Nyamonye', villages: ['Nyamonye'] }
        ],
        'Central Gem': [
            { name: 'Siriwo / Kagilo', villages: ['Kagilo'] },
            { name: 'Gongo / Nyandiwa / Nyawara', villages: ['Nyawara'] }
        ],
        'East Gem': [
            { name: 'Marenyo / Lihanda', villages: ['Marenyo'] },
            { name: 'Uranga / Ramula', villages: ['Ramula'] }
        ],
        'North Gem': [
            { name: 'Malanga / Nyabeda', villages: ['Malanga'] },
            { name: 'Ndere / Asayi / Sirembe', villages: ['Sirembe'] },
            { name: 'Got Regea / Lundha / Maliera', villages: ['Maliera'] }
        ],
        'South Gem': [
            { name: 'Rera / Kambare / Ndori', villages: ['Ndori'] },
            { name: 'Gombe / Onyinyore', villages: ['Gombe'] },
            { name: 'Kanyadet / Kaudha West / Kaudha East', villages: ['Kaudha'] }
        ],
        'West Gem': [
            { name: 'Malunga West / Malunga East / Malunga Central', villages: ['Malunga'] },
            { name: 'Wagai West / Wagai East / Uriri', villages: ['Wagai'] },
            { name: 'Dienya West / Dienya East / Nguge', villages: ['Dienya'] }
        ],
        'Yala Township': [
            { name: 'Anyiko / Sauri', villages: ['Anyiko'] },
            { name: 'Nyamninia', villages: ['Nyamninia'] },
            { name: 'Jina', villages: ['Jina'] }
        ],
        'East Asembo': [
            { name: 'Omia Mwalo / Omia Diere', villages: ['Omia'] },
            { name: 'Omia Malo', villages: ['Omia Malo'] },
            { name: 'North Ramba / South Ramba', villages: ['Ramba'] }
        ],
        'North Uyoma': [
            { name: 'Masala', villages: ['Masala'] },
            { name: 'West Katwenga', villages: ['Upper Katwenga'] },
            { name: 'East Katwenga', villages: ['Lower Katwenga'] },
            { name: 'Kochienga / Ragengni', villages: ['Ragengni'] }
        ],
        'South Uyoma': [
            { name: 'Lieta / Ndigwa', villages: ['Ndigwa'] },
            { name: 'Naya', villages: ['Naya'] }
        ],
        'West Asembo': [
            { name: 'Nyagoko / Akom', villages: ['Nyagoko'] },
            { name: 'Siger', villages: ['Siger'] },
            { name: 'Mahaya', villages: ['Mahaya'] }
        ],
        'West Uyoma': [
            { name: 'Memba / Rachar / Kobong', villages: ['Kobong'] },
            { name: 'Nyabera / Kokwiri', villages: ['Kokwiri'] },
            { name: 'Kagwa', villages: ['Kagwa'] }
        ],
        'East Ugenya': [
            { name: 'Ramunde / Kathieno A', villages: ['Ramunde'] },
            { name: 'Kathieno B / Kathieno C', villages: ['Kathieno'] },
            { name: 'Anyiko / Sihahi', villages: ['Sihahi'] }
        ],
        'North Ugenya': [
            { name: 'Nyamsenda / Ligala', villages: ['Nyamsenda-Ligala'] },
            { name: 'Jera', villages: ['Jera'] },
            { name: 'Kagonya / Sega', villages: ['Sega-Kagonya'] }
        ],
        'West Ugenya': [
            { name: 'Karadolo East / Karadolo West', villages: ['Karadolo'] },
            { name: 'Masat East / Masat West', villages: ['Masat'] },
            { name: 'Sifuyo East / Sifuyo West', villages: ['Sifuyo'] },
            { name: 'Nyalenya / Uyundo', villages: ['Uyundo'] },
            { name: 'Ndenga', villages: ['Ndenga'] }
        ],
        'Ukwala': [
            { name: 'Doho East / Doho West', villages: ['Doho'] },
            { name: 'Simur / Simur East / Simur Kondiek', villages: ['Simur'] },
            { name: 'Yenga / Siranga', villages: ['Yenga'] }
        ],
        'Sidindi': [
            { name: 'Simenya / Rangala', villages: ['Rangala'] },
            { name: 'Yiro West / Yiro East', villages: ['Yiro'] },
            { name: 'Ruwe / Uhuyi', villages: ['Ruwe'] }
        ],
        'Sigomere': [
            { name: 'Got Osimbo', villages: ['Got Osimbo'] },
            { name: 'Mungao / Madungu / Sigomre', villages: ['Sigomre'] },
            { name: 'Tingare East / Tingare West / Asango East / Asango West', villages: ['Tingare'] }
        ],
        'Ugunja': [
            { name: 'Ligega', villages: ['Ugunja-Ligega'] },
            { name: 'Ugunja', villages: ['Ugunja'] },
            { name: 'Umala / Ngunya', villages: ['Umala'] },
            { name: 'Ambira', villages: ['Ambira'] },
            { name: 'Rambula South / Rambula North', villages: ['Rambula'] },
            { name: 'Magoya', villages: ['Magoya'] }
        ]
    };

    window.SIAYA_LOCATION_HIERARCHY = hierarchy;
    window.SIAYA_VILLAGES_BY_WARD = Object.fromEntries(
        Object.entries(hierarchy).map(([ward, subLocations]) => [
            ward,
            subLocations.flatMap((subLocation) => subLocation.villages)
        ])
    );
})();

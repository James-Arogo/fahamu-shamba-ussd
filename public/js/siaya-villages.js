(function () {
    'use strict';

    const seedVillagesByWard = {
        'West Yimbo': ['Usenge', 'Uhanya', 'Nyamonye', 'Misori'],
        'Yimbo East': ['Nyamonye East', 'Got Abiero', 'Nyaguda', 'Ragengni'],
        'Central Sakwa': ['Bondo Town', 'Bar Kowino', 'Nyawita', 'Ajigo'],
        'South Sakwa': ['Nyamira', 'Nyawita South', 'Got Agulu', 'Uyawi'],
        'West Sakwa': ['Got Matar', 'Bar Chando', 'Ratiya', 'Kapiyo'],
        'North Sakwa': ['Ajigo North', 'Nyawita North', 'Ojwando', 'Nyamonye North'],
        'West Asembo': ['Kanyigoro', 'Kanyibok', 'Mahaya', 'Kalandin'],
        'East Asembo': ['Madiany', 'Kanyibok East', 'Kanyango', 'Nyangera'],
        'North Uyoma': ['Aram', 'Ramba', 'Nyagoko', 'Kobong'],
        'South Uyoma': ['Ndori', 'Ragengni Uyoma', 'Kisui', 'Naya'],
        'West Uyoma': ['Lwak', 'Kisui West', 'Nyagoko West', 'Kanyamaji'],
        'Ukwala': ['Ukwala Town', 'Sega', 'Simur', 'Nyambare'],
        'North Ugenya': ['Ligega', 'Sifuyo', 'Bar Anyali', 'Masat East'],
        'East Ugenya': ['Ujwang\'a', 'Sihayi', 'Uringi', 'Murumba'],
        'West Ugenya': ['Bar Anyali West', 'Ligega West', 'Masat', 'Nyalenya'],
        'Sidindi': ['Sidindi Centre', 'Ruwe', 'Nyangera Ugunja', 'Ngunya'],
        'Sigomere': ['Sigomere Centre', 'Nyasanda', 'Bar Sauri', 'Nyangoma'],
        'Ugunja': ['Ugunja Town', 'Sega Road', 'Mungao', 'Ugunja East'],
        'Siaya Township': ['Mulaha', 'Nyandiwa', 'Karapul', 'Siaya Town'],
        'Usonga': ['Sumba', 'Nyadorera A', 'Nyadorera B', 'Lwanda'],
        'North Alego': ['Hono', 'Nyalgunga', 'Ulafu', 'Umala'],
        'South East Alego': ['Mur Ngiya', 'Bar Agulu', 'Randago', 'Pap Oriang'],
        'Central Alego': ['Kadenge', 'Obambo', 'Kochieng', 'Koyeyo'],
        'West Alego': ['Hawinga', 'Gangu', 'Mahola', 'Kodiere'],
        'North Gem': ['Ndere', 'Nyabeda', 'Malanga', 'Sirembe'],
        'South Gem': ['Kaudha West', 'Kaudha East', 'Ndori', 'Rera'],
        'East Gem': ['Ramula', 'Uranga', 'Lihanda', 'Marenyo'],
        'Central Gem': ['Siriwo', 'Kagilo', 'Gango', 'Nyawara'],
        'Yala Township': ['Nyamninia', 'Sauri', 'Anyiko', 'Jina'],
        'West Gem': ['Dienya', 'Wagai', 'Nguge', 'Uriri']
    };

    function buildSubLocations(ward, villages) {
        const midpoint = Math.ceil(villages.length / 2);
        const first = villages.slice(0, midpoint);
        const second = villages.slice(midpoint);

        return [
            {
                name: `${ward} North Sub-Location`,
                villages: first.length ? first : [`${ward} Centre`]
            },
            {
                name: `${ward} South Sub-Location`,
                villages: second.length ? second : [`${ward} South`]
            }
        ];
    }

    const hierarchy = Object.fromEntries(
        Object.entries(seedVillagesByWard).map(([ward, villages]) => [ward, buildSubLocations(ward, villages)])
    );

    window.SIAYA_LOCATION_HIERARCHY = hierarchy;
    window.SIAYA_VILLAGES_BY_WARD = Object.fromEntries(
        Object.entries(hierarchy).map(([ward, subLocations]) => [
            ward,
            subLocations.flatMap((subLocation) => subLocation.villages)
        ])
    );
})();

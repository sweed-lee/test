(function initLevelData() {
  "use strict";

  const MAP_OPEN = [
    "###############",
    "#S...........G#",
    "#.............#",
    "#.............#",
    "#.............#",
    "#.............#",
    "#.............#",
    "#.............#",
    "###############"
  ];

  const MAP_SPLIT = [
    "###############",
    "#S....#.......#",
    "#.....#.......#",
    "#.....#.......#",
    "#...........G.#",
    "#.....#.......#",
    "#.....#.......#",
    "#.....#.......#",
    "###############"
  ];

  const MAP_DOUBLE_SPLIT = [
    "###############",
    "#S....#...#...#",
    "#.....#...#...#",
    "#.....#...#...#",
    "#...........G.#",
    "#.....#...#...#",
    "#.....#...#...#",
    "#.....#...#...#",
    "###############"
  ];

  const MAP_TRIPLE_SPLIT = [
    "###############",
    "#S..#...#..#G.#",
    "#...#...#..#..#",
    "#...#...#..#..#",
    "#.............#",
    "#...#...#..#..#",
    "#...#...#..#..#",
    "#...#...#..#..#",
    "###############"
  ];

  window.CHRONO_LEVELS = [
    {
      id: 1,
      name: "1) Tutorial: Echo Warmup",
      hint: "Recording runs first, then Sync begins. Reach the goal during Sync.",
      map: MAP_OPEN,
      recordTicks: 55,
      syncTicks: 180
    },
    {
      id: 2,
      name: "2) Toggle Switch Basics",
      hint: "Step on the blue button to toggle the blue door.",
      map: MAP_SPLIT,
      recordTicks: 65,
      syncTicks: 180,
      buttons: [
        { id: "btnA", x: 3, y: 6, linkedDoorIds: ["doorA"] }
      ],
      doors: [
        { id: "doorA", x: 6, y: 4, trigger: "toggle", defaultOpen: false }
      ]
    },
    {
      id: 3,
      name: "3) Plate Hold Introduction",
      hint: "Pressure doors only stay open while occupied. Leave your clone on the plate.",
      map: MAP_SPLIT,
      recordTicks: 75,
      syncTicks: 210,
      plates: [
        { id: "plateA", x: 3, y: 6, linkedDoorIds: ["doorA"] }
      ],
      doors: [
        { id: "doorA", x: 6, y: 4, trigger: "plate", linkedPlateIds: ["plateA"], defaultOpen: false }
      ]
    },
    {
      id: 4,
      name: "4) Commitment Gate",
      hint: "One-way gates only permit movement in their arrow direction.",
      map: MAP_SPLIT,
      recordTicks: 75,
      syncTicks: 210,
      buttons: [
        { id: "btnA", x: 2, y: 2, linkedDoorIds: ["doorA"] }
      ],
      doors: [
        { id: "doorA", x: 6, y: 4, trigger: "toggle", defaultOpen: false }
      ],
      oneWayGates: [
        { x: 9, y: 4, direction: "right" }
      ]
    },
    {
      id: 5,
      name: "5) Two-Door Sequence",
      hint: "Open the first choke point, then move into the middle chamber for the second switch.",
      map: MAP_DOUBLE_SPLIT,
      recordTicks: 90,
      syncTicks: 230,
      buttons: [
        { id: "btnA", x: 2, y: 6, linkedDoorIds: ["doorA"] },
        { id: "btnB", x: 8, y: 2, linkedDoorIds: ["doorB"] }
      ],
      doors: [
        { id: "doorA", x: 6, y: 4, trigger: "toggle", defaultOpen: false },
        { id: "doorB", x: 10, y: 4, trigger: "toggle", defaultOpen: false }
      ]
    },
    {
      id: 6,
      name: "6) Clone Holds, Player Toggles",
      hint: "Record your clone onto the plate first. Then in Sync, you handle the button.",
      map: MAP_DOUBLE_SPLIT,
      recordTicks: 95,
      syncTicks: 240,
      plates: [
        { id: "plateA", x: 3, y: 6, linkedDoorIds: ["doorA"] }
      ],
      buttons: [
        { id: "btnB", x: 8, y: 2, linkedDoorIds: ["doorB"] }
      ],
      doors: [
        { id: "doorA", x: 6, y: 4, trigger: "plate", linkedPlateIds: ["plateA"], defaultOpen: false },
        { id: "doorB", x: 10, y: 4, trigger: "toggle", defaultOpen: false }
      ]
    },
    {
      id: 7,
      name: "7) Queue the Clone Route",
      hint: "During recording, touch the button then finish on the plate.",
      map: MAP_DOUBLE_SPLIT,
      recordTicks: 100,
      syncTicks: 260,
      buttons: [
        { id: "btnA", x: 3, y: 6, linkedDoorIds: ["doorA"] }
      ],
      plates: [
        { id: "plateB", x: 8, y: 6, linkedDoorIds: ["doorB"] }
      ],
      doors: [
        { id: "doorA", x: 6, y: 4, trigger: "toggle", defaultOpen: false },
        { id: "doorB", x: 10, y: 4, trigger: "plate", linkedPlateIds: ["plateB"], defaultOpen: false }
      ]
    },
    {
      id: 8,
      name: "8) Plate + One-Way Choke",
      hint: "Once you pass the one-way gate, you cannot backtrack through it.",
      map: MAP_SPLIT,
      recordTicks: 95,
      syncTicks: 240,
      plates: [
        { id: "plateA", x: 2, y: 1, linkedDoorIds: ["doorA"] }
      ],
      doors: [
        { id: "doorA", x: 6, y: 4, trigger: "plate", linkedPlateIds: ["plateA"], defaultOpen: false }
      ],
      oneWayGates: [
        { x: 5, y: 4, direction: "right" }
      ]
    },
    {
      id: 9,
      name: "9) Temporal Blocker",
      hint: "Orange blockers can target only one timeline. Here, it stops clones.",
      map: MAP_SPLIT,
      recordTicks: 105,
      syncTicks: 260,
      plates: [
        { id: "plateA", x: 4, y: 6, linkedDoorIds: ["doorA"] }
      ],
      doors: [
        { id: "doorA", x: 6, y: 4, trigger: "plate", linkedPlateIds: ["plateA"], defaultOpen: false }
      ],
      blockers: [
        { x: 4, y: 5, blocks: "clone" }
      ]
    },
    {
      id: 10,
      name: "10) Mixed Chamber Logic",
      hint: "Plate opens the first door; button toggles the second; one-way controls commitment.",
      map: MAP_DOUBLE_SPLIT,
      recordTicks: 110,
      syncTicks: 280,
      plates: [
        { id: "plateA", x: 2, y: 2, linkedDoorIds: ["doorA"] }
      ],
      buttons: [
        { id: "btnB", x: 8, y: 6, linkedDoorIds: ["doorB"] }
      ],
      doors: [
        { id: "doorA", x: 6, y: 4, trigger: "plate", linkedPlateIds: ["plateA"], defaultOpen: false },
        { id: "doorB", x: 10, y: 4, trigger: "toggle", defaultOpen: false }
      ],
      oneWayGates: [
        { x: 9, y: 4, direction: "right" }
      ],
      blockers: [
        { x: 8, y: 3, blocks: "both" }
      ]
    },
    {
      id: 11,
      name: "11) Triple Choke Setup",
      hint: "Chain your recording to prepare multiple gates for the live run.",
      map: MAP_TRIPLE_SPLIT,
      recordTicks: 120,
      syncTicks: 300,
      buttons: [
        { id: "btnA", x: 2, y: 6, linkedDoorIds: ["doorA"] },
        { id: "btnC", x: 9, y: 6, linkedDoorIds: ["doorC"] }
      ],
      plates: [
        { id: "plateB", x: 6, y: 2, linkedDoorIds: ["doorB"] }
      ],
      doors: [
        { id: "doorA", x: 4, y: 4, trigger: "toggle", defaultOpen: false },
        { id: "doorB", x: 8, y: 4, trigger: "plate", linkedPlateIds: ["plateB"], defaultOpen: false },
        { id: "doorC", x: 11, y: 4, trigger: "toggle", defaultOpen: false }
      ],
      oneWayGates: [
        { x: 10, y: 4, direction: "right" }
      ]
    },
    {
      id: 12,
      name: "12) Final: Chrono Orchestra",
      hint: "Use every mechanic: toggles, sustained pressure, one-way flow, and blocker timing.",
      map: MAP_TRIPLE_SPLIT,
      recordTicks: 130,
      syncTicks: 320,
      buttons: [
        { id: "btnB", x: 6, y: 2, linkedDoorIds: ["doorB"] }
      ],
      plates: [
        { id: "plateA", x: 2, y: 6, linkedDoorIds: ["doorA"] },
        { id: "plateC", x: 9, y: 6, linkedDoorIds: ["doorC"] }
      ],
      doors: [
        { id: "doorA", x: 4, y: 4, trigger: "plate", linkedPlateIds: ["plateA"], defaultOpen: false },
        { id: "doorB", x: 8, y: 4, trigger: "toggle", defaultOpen: false },
        { id: "doorC", x: 11, y: 4, trigger: "plate", linkedPlateIds: ["plateC"], defaultOpen: false }
      ],
      oneWayGates: [
        { x: 5, y: 4, direction: "right" },
        { x: 10, y: 4, direction: "right" }
      ],
      blockers: [
        { x: 9, y: 5, blocks: "clone" }
      ]
    }
  ];
})();

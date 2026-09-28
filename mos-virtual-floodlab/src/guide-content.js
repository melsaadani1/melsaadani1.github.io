export const GUIDE_VERSION="20260928-intro2";
export const GUIDES = {
  "buildings": {
    "title": "From water depth to a damage bill",
    "time": "3–5 minutes",
    "goal": "Explain why two objects in the same flood can have different losses.",
    "steps": [
      {
        "title": "Choose a building. Start dry.",
        "action": "Choose The one-story home, then click Dry under the water slider. Drag the scene to look around and keep Cutaway on to see inside.",
        "notice": "The house floor is raised above ground. Water can reach equipment underneath before it reaches furniture inside.",
        "question": "Which gets wet first: equipment below the floor, or furniture in the rooms?",
        "cues": [
          {
            "label": "Find building choice",
            "target": "[data-building=\"house1\"], #expanded-building",
            "panel": "none"
          },
          {
            "label": "Find Dry",
            "target": "[data-inside=\"dry\"]",
            "panel": "none"
          }
        ]
      },
      {
        "title": "Bring water into the rooms",
        "action": "Click 1 ft inside, then 2 ft inside. Watch red objects and the loss totals. The slider lets you try other depths.",
        "notice": "“Inside” measures above the first floor. The slider measures above ground. Red represents modeled damage, not collapse.",
        "cues": [
          {
            "label": "Find 1 ft inside",
            "target": "[data-inside=\"1\"]",
            "panel": "none"
          },
          {
            "label": "Find 2 ft inside",
            "target": "[data-inside=\"2\"]",
            "panel": "none"
          }
        ]
      },
      {
        "title": "Read one item’s damage",
        "action": "Select Stove / range, then Countertop microwave in the Contents list. Open the item calculation to read its value, damage percentage and cost.",
        "notice": "Loss = value × damage fraction. The microwave sits higher, so its damage can differ from the stove’s at the same water level.",
        "cues": [
          {
            "label": "Find Stove / range",
            "target": "#receipt [data-item=\"range\"]",
            "category": "contents",
            "panel": "loss"
          },
          {
            "label": "Find microwave",
            "target": "#receipt [data-item=\"microwave\"]",
            "category": "contents",
            "panel": "loss"
          },
          {
            "label": "Show item calculation",
            "target": "#inspector",
            "panel": "item",
            "pointer": false
          }
        ]
      },
      {
        "title": "Compare the two parts of the bill",
        "action": "Click Building in the receipt to see building components. Use Find chart units to locate Show dollars, directly above the chart. Click it to see money instead of percentages; Show percentages switches back.",
        "notice": "Contents and building use different total values. Add their dollar losses, not their percentages. In expanded view, Find opens Damage & curves for you.",
        "cues": [
          {
            "label": "Find Building tab",
            "target": "#building-tab",
            "panel": "loss"
          },
          {
            "label": "Find chart units",
            "target": "#chart-mode",
            "panel": "loss",
            "note": "The highlighted button switches chart units. If it says “Show percentages,” you are already viewing dollars."
          }
        ]
      },
      {
        "title": "Protect one item. Test the effect.",
        "action": "Choose a damaged item from Contents, then find Raise item 2 ft. Keep the water fixed and compare that item’s cost before and after. If the button says Put item back, it is already raised.",
        "notice": "Raising an item changes when damage starts. Other items keep their own losses; the cost of raising the item is excluded.",
        "question": "Why did this item’s loss change at the same water level? Then try the two-story home or clinic.",
        "cues": [
          {
            "label": "Find Contents list",
            "target": "#contents-tab",
            "category": "contents",
            "panel": "loss"
          },
          {
            "label": "Find Raise item 2 ft",
            "target": "#elevate",
            "panel": "item"
          }
        ]
      }
    ],
    "narration": [
      "How does floodwater become an economic loss? Connect water depth, damage to individual objects, and the cost for a building and its contents.",
      "Explore a one-story home, a two-story home, or a clinic. Rotate, zoom, and use the cutaway to examine objects at different heights.",
      "Change the water level with a slider or the indoor-depth presets. Red shading reveals modeled damage, while the receipt separates contents from building components.",
      "Select an item to see its value, damage percentage, and cost. The chart displays percentages or dollars, showing how individual losses add up.",
      "Raise a selected item to test how its loss changes at the same water level. The interactive guide helps you find each control.",
      "These are illustrative classroom estimates. Your challenge: explain why the same flood does not cause the same damage everywhere."
    ]
  },
  "roads": {
    "title": "From a flooded road to recovery",
    "time": "3–5 minutes",
    "goal": "Distinguish flood depth, repair cost and time to recover.",
    "steps": [
      {
        "title": "Choose and run a flood",
        "action": "Choose 4 ft above the stream banks. Click Start a 4 ft flood, then Start flood in the confirmation. Watch the water rise and drain.",
        "notice": "The chosen rise is above stream banks, not the depth on every road. Lower connected streets flood first; high streets can stay dry.",
        "cues": [
          {
            "label": "Find flood height",
            "target": "#road-peak"
          },
          {
            "label": "Find Start flood",
            "target": "#road-run"
          }
        ]
      },
      {
        "title": "Inspect a red road",
        "action": "After the water drains, click a red road piece. Or choose a street section from the Inspect menu. Read its local depth and repair bill.",
        "notice": "Red remains after the water leaves because work is still needed. One piece’s value × damage fraction contributes to the street section and town totals.",
        "cues": [
          {
            "label": "Find road section",
            "target": "#road-section",
            "panel": "inspect"
          }
        ]
      },
      {
        "title": "Connect depth with cost",
        "action": "Open Curves. Compare the depth–damage curve with the recovery curve below it. Select another road to see a different local depth.",
        "notice": "The damage curve maps water depth to repair fraction. The recovery curve maps days to the share of road length with no work remaining.",
        "cues": [
          {
            "label": "Find Curves tab",
            "target": "#road-tab-curves",
            "panel": "curves"
          }
        ]
      },
      {
        "title": "Change the number of crews",
        "action": "Keep the same flood. Compare 1 crew with 4 crews. Read the All work finished day and the town’s original repair cost.",
        "notice": "More crews shorten the work queue. They do not change how much damage the flood caused or erase the recorded event bill.",
        "question": "Which should change with more crews: the repair bill, the finish day, or both?",
        "cues": [
          {
            "label": "Find repair crews",
            "target": "#road-crews"
          }
        ]
      },
      {
        "title": "Follow the town’s recovery",
        "action": "Click Play recovery. Use Find a repair crew to inspect a job, or drag the repair timeline to compare days.",
        "notice": "Red streets need work; green streets have finished work. Residents return along available routes. The day counter is model time, not video time.",
        "question": "Try a larger flood with the same crews. Does it affect more road pieces, increase their damage, or both?",
        "cues": [
          {
            "label": "Find Play recovery",
            "target": "#road-play-repair"
          },
          {
            "label": "Find repair timeline",
            "target": "#road-day"
          },
          {
            "label": "Find a repair crew",
            "target": "#road-watch-crew"
          }
        ]
      }
    ],
    "narration": [
      "A flood can disappear while its economic effects remain. Explore road damage, repair costs, and recovery across a small town.",
      "Choose a rise above the stream banks, then run the flood. Watch water reach connected low streets while higher roads may stay dry.",
      "After drainage, red roads still need work. Select one to inspect its local depth, damage fraction, and contribution to the repair bill.",
      "The Curves tab links depth with damage and shows recovery through time. Repair jobs let you see which sections are waiting, underway, or finished.",
      "Change the number of crews, play recovery, or move the day slider. Watch crews work and residents return. More crews can finish sooner without changing the original damage bill.",
      "These are simplified estimates. Your challenge: distinguish what controls damage from what controls recovery. The interactive guide helps you find each control."
    ]
  },
  "accessibility": {
    "title": "Can this trip stay connected?",
    "time": "3–5 minutes",
    "goal": "Read a detour, a disconnection and a return of access.",
    "steps": [
      {
        "title": "Choose a trip",
        "action": "Choose A and B from the landmark menus, search for a place, or click roads on the map. For a first run, choose a Ready-made trip.",
        "notice": "Your points snap to the road network. Read the point labels before continuing; a nearby road point may differ from a building entrance.",
        "cues": [
          {
            "label": "Find start A",
            "target": "#access-preset-a",
            "panel": "details"
          },
          {
            "label": "Find destination B",
            "target": "#access-preset-b",
            "panel": "details"
          },
          {
            "label": "Find ready-made trips",
            "target": "#access-example",
            "panel": "details"
          }
        ]
      },
      {
        "title": "Move through the flood",
        "action": "Click Play flood, or click an hour below the chart. Watch road colors and the route as the saved flood snapshots change.",
        "notice": "In this experiment, road pieces close at 6 inches of water or more. Each snapshot is 4 hours apart; the map is not live navigation.",
        "cues": [
          {
            "label": "Find Play flood",
            "target": "#access-play"
          },
          {
            "label": "Show saved hours",
            "target": "#access-time-buttons",
            "pointer": false
          }
        ]
      },
      {
        "title": "Read a connection—or a gap",
        "action": "Read the connection card and travel-time chart. Try a Ready-made trip that loses access to see a gap, then move to a later hour.",
        "notice": "A chart gap means no route, not zero travel time. When disconnected, the teal network shows where A can still reach. Not every trip disconnects.",
        "question": "Can a trip become slower before it loses its connection entirely?",
        "cues": [
          {
            "label": "Show travel-time chart",
            "target": "#access-chart",
            "pointer": false
          },
          {
            "label": "Find example trips",
            "target": "#access-example",
            "panel": "details"
          }
        ]
      },
      {
        "title": "Explain what changed",
        "action": "Read the connection windows in Trip details. Compare an early snapshot, a closed interval and a later snapshot. Use Road check to inspect a road.",
        "notice": "Durations are estimates between saved snapshots. Roads reopen below the depth threshold here; repair delays belong to the road-recovery experiment.",
        "question": "Did your trip stay connected, take a detour, or become disconnected? What changed when the water receded?",
        "cues": [
          {
            "label": "Show connection windows",
            "target": ".access-outages",
            "panel": "details",
            "pointer": false
          },
          {
            "label": "Find Road check",
            "target": "#access-inspect"
          }
        ]
      }
    ],
    "narration": [
      "A flooded road can affect people far from the water. Explore whether places remain connected, how travel time changes, and when access returns.",
      "Choose two road points. Landmark menus, place search, and ready-made trips help you explore journeys across Lafayette.",
      "Play the flood or choose a saved hour. Roads close at six inches of modeled water depth. The available route updates as conditions change.",
      "The travel-time chart distinguishes a detour from disconnection. A gap means no route; teal roads show where the starting point can still reach.",
      "Connection windows summarize interruptions and reconnection. Road check inspects individual roads; map controls change the displayed layers.",
      "Snapshots are four hours apart, and repair delays are excluded. Your challenge: explain how the same flood affects different trips. These examples are not navigation advice."
    ]
  },
  "hh": {
    "title": "Four steps from rain to flooding",
    "time": "About 5 minutes",
    "goal": "Explain why a discharge hydrograph is not a flood-depth map.",
    "follow": true,
    "steps": [
      {
        "title": "1 · Set the storm",
        "action": "Choose rainfall and infiltration in the right panel. Explore Land use or Terrain if useful. Then follow the glowing 2 · Follow the runoff button.",
        "notice": "Rainfall is an input. Infiltration controls how much water enters soil; the remaining water can contribute to runoff.",
        "cues": [
          {
            "label": "Find rainfall",
            "target": "#rain"
          },
          {
            "label": "Find infiltration",
            "target": "#infiltration"
          },
          {
            "label": "Find next step",
            "target": "#step-next"
          }
        ]
      },
      {
        "title": "2 · Follow the runoff",
        "action": "Click Infiltration, then Overland flow below the map. Follow the highlighted button to Create hydrograph. Continue when your curve appears.",
        "notice": "Hydrology gives discharge through time: how much water passes the outlet each second, not water height or flooded area.",
        "cues": [
          {
            "label": "Find the next action",
            "target": ".next-target"
          },
          {
            "label": "Find Create hydrograph",
            "target": "#run-hydro"
          }
        ]
      },
      {
        "title": "3 · See the flooding",
        "action": "Compare Depth, Water elevation, Velocity and Extent. Click Locate village edge to inspect a fixed point. Replay the flood, then continue to step 4.",
        "notice": "Hydraulics links flow with terrain to show flooding. Depth is above local ground; elevation is above the scene’s datum. This flood map is illustrative.",
        "cues": [
          {
            "label": "Find Depth",
            "target": "[data-output=\"depth\"]"
          },
          {
            "label": "Find Replay flood",
            "target": "#replay"
          },
          {
            "label": "Find next step",
            "target": "#step-next"
          }
        ]
      },
      {
        "title": "4 · Change and compare",
        "action": "Pin the original hydrograph. Change rainfall OR infiltration. Compare Original flood and Changed flood; pin the new hydrograph to keep both curves.",
        "notice": "Keep one input unchanged so you can explain the other’s effect. Read discharge on the chart, and depth and flooded land in the table.",
        "question": "What changed in runoff, discharge and inundation? The i buttons and Equations & model details offer optional explanations.",
        "cues": [
          {
            "label": "Find Pin this run",
            "target": "#pin-hydro"
          },
          {
            "label": "Find Try more rain",
            "target": "#more-rain"
          },
          {
            "label": "Show comparison table",
            "target": "#compare-panel",
            "pointer": false
          }
        ]
      }
    ],
    "narration": [
      "How does rainfall become flow, and how does flow become flooding? Explore both questions in Rohan Creek, a watershed with one outlet.",
      "Begin with rainfall and infiltration. Explore terrain and land-use layers, or open additional storm and land-cover options.",
      "Follow infiltration and runoff, then create a hydrograph. Hydrology gives discharge through time, not water height.",
      "Next, explore depth, water elevation, velocity, and flood extent. Replay the flood, inspect a point, or view the mesh.",
      "Change one input. Pin hydrographs, switch between original and changed floods, and read the comparison table.",
      "Four numbered steps keep you on track. Optional explanations and equations add detail. These flood maps are illustrative. Can you connect rainfall, runoff, discharge, and inundation?"
    ]
  }
};

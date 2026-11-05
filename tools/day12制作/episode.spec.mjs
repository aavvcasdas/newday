// 当前25行口播的九镜导演规划。未实测、未完成资产/接触审核，禁止当作生产成片。
export default {
  "day": 12,
  "title": "笨鱼回来了，还学会摇豆包了",
  "speaker": "本鲸",
  "directorVersion": 1,
  "status": "planning",
  "measured": false,
  "sourceScriptSha256": "42625d93cb49999da0f67860ab3dd3dca9b37b6583b623a1cc25cb3928072d02",
  "pending": [
    "未提供Day12指定音源及词级实测轴",
    "C05拉纸、C07翻纸、C08按纸/推纸/圈记须素材和接触校准，不冒充已实现完整动作",
    "无声四段样片不替代全片逐镜视觉验收、指定音源试剪与音频/final门禁"
  ],
  "opener": {
    "headlinePrefix": "笨鱼回来了，",
    "headlineHighlight": "还学会摇人了？",
    "actorA": {
      "pose": "point",
      "x": 470,
      "y": 600,
      "u": 38,
      "idleMotion": 0
    },
    "actorB": {
      "pose": "think",
      "x": 810,
      "y": 600,
      "u": 38,
      "idleMotion": 0
    },
    "foregroundProps": []
  },
  "shots": [
    {
      "id": "C01",
      "fromLine": 1,
      "toLine": 2,
      "framing": "two_shot",
      "mood": "work_cool",
      "actors": [
        {
          "pose": "point",
          "x": 470,
          "y": 600,
          "u": 38,
          "idleMotion": 0,
          "name": "本鲸",
          "poses": [
            {
              "line": 2,
              "pose": "shock"
            }
          ]
        },
        {
          "pose": "think",
          "x": 810,
          "y": 600,
          "u": 38,
          "idleMotion": 0,
          "walk": {
            "from": 1370,
            "to": 810,
            "startLine": 2,
            "duration": 1.3
          },
          "name": "笨鱼"
        }
      ],
      "companionProps": [
        {
          "propId": "folded_page",
          "x": 640,
          "y": 500,
          "scale": 0.85,
          "fromLine": 2,
          "state": {
            "title": "昨日岗位",
            "text": "昨日岗位",
            "sub": ""
          }
        }
      ],
      "interactions": [],
      "direction": {
        "kind": "staging",
        "focus": "笨鱼和昨天岗位纸的回归关系",
        "entry": "本鲸在桌左，右侧空位；纸上旧标记保留",
        "action": "笨鱼从右侧有步态入镜，到岗位纸旁停稳；本鲸让出视线，观众先看回归再看纸",
        "trigger": "L02「回」",
        "wordLine": 2,
        "wordChar": "回",
        "result": "笨鱼落到桌右，旧任务仍在，不用两人整体弹跳宣布回归",
        "resultLine": 2,
        "resultChar": "岗",
        "reaction": "本鲸在笨鱼回归句切震惊姿态一次，之后保持，不循环点头",
        "exit": "笨鱼停在桌右，岗位纸仍在原落点",
        "transition": "从笨鱼视线切到评论区@条",
        "continuity": {
          "in": "桌右空、旧岗位在桌",
          "out": "笨鱼桌右、旧岗位在桌"
        },
        "settleSeconds": 0.3,
        "holdSeconds": 0.4
      },
      "foregroundTable": {
        "x": 430,
        "y": 534,
        "width": 420
      }
    },
    {
      "id": "C02",
      "fromLine": 3,
      "toLine": 4,
      "framing": "medium_right",
      "mood": "work_cool",
      "actors": [
        {
          "pose": "point",
          "x": 470,
          "y": 600,
          "u": 38,
          "idleMotion": 0,
          "name": "本鲸"
        },
        {
          "pose": "fatfish_working",
          "x": 810,
          "y": 600,
          "u": 38,
          "idleMotion": 0,
          "name": "笨鱼"
        }
      ],
      "companionProps": [
        {
          "propId": "name_plate",
          "x": 810,
          "y": 500,
          "scale": 0.85,
          "fromLine": 3,
          "state": {
            "title": "@豆包",
            "text": "@豆包",
            "sub": ""
          }
        }
      ],
      "interactions": [],
      "direction": {
        "kind": "prop",
        "focus": "由笨鱼发起的@豆包示意，不是观众刷屏",
        "entry": "笨鱼在桌右，承接前镜目光",
        "action": "待确认问题条在笨鱼一侧，随后出现@豆包；本鲸的“开窍→摇人”留反应停顿",
        "trigger": "L03「艾」",
        "wordLine": 3,
        "wordChar": "艾",
        "result": "@条落在笨鱼一侧，明确帮忙入口，不伪造真实平台截图",
        "resultLine": 3,
        "resultChar": "豆",
        "reaction": "本鲸停一下再指问题条，动作在短句间发生",
        "exit": "@条留桌边，视线转岗位问题",
        "transition": "切桌面近景看她如何回答",
        "continuity": {
          "in": "笨鱼在桌右、旧岗位在桌",
          "out": "新增@条，旧岗位不动"
        },
        "settleSeconds": 0.3,
        "holdSeconds": 0.4
      }
    },
    {
      "id": "C03",
      "fromLine": 5,
      "toLine": 7,
      "framing": "insert_center",
      "mood": "work_cool",
      "actors": [],
      "companionProps": [
        {
          "propId": "name_plate",
          "x": 640,
          "y": 365,
          "scale": 1,
          "fromLine": 5,
          "state": {
            "text": "没经验，能投吗？"
          }
        },
        {
          "propId": "folded_page",
          "x": 640,
          "y": 500,
          "scale": 0.85,
          "fromLine": 6,
          "state": {
            "title": "录取通知",
            "text": "录取通知",
            "sub": ""
          }
        }
      ],
      "interactions": [],
      "direction": {
        "kind": "prop",
        "focus": "能不能投与录取通知的错误对照",
        "entry": "旧岗位在桌，@条在右后侧",
        "action": "先看投递问题，再切新增录取通知，通知落桌后固定；省略递纸全过程，不用飞纸碰脸",
        "trigger": "L06「递」",
        "wordLine": 6,
        "wordChar": "递",
        "result": "未面试先开录取通知的夸口可辨",
        "resultLine": 6,
        "resultChar": "来",
        "reaction": "切本鲸反应前留理解时间",
        "exit": "通知正面朝上，旧岗位保留",
        "transition": "从通知切本鲸表情近景",
        "continuity": {
          "in": "旧岗位加@条",
          "out": "新增正面录取通知"
        },
        "settleSeconds": 0.3,
        "holdSeconds": 0.4
      },
      "foregroundTable": {
        "x": 430,
        "y": 534,
        "width": 420
      }
    },
    {
      "id": "C04",
      "fromLine": 8,
      "toLine": 10,
      "framing": "close_left",
      "mood": "work_cool",
      "actors": [
        {
          "pose": "think",
          "x": 470,
          "y": 600,
          "u": 38,
          "idleMotion": 0,
          "poses": [
            {
              "line": 9,
              "pose": "shock"
            }
          ],
          "name": "本鲸"
        },
        {
          "pose": "think",
          "x": 810,
          "y": 600,
          "u": 38,
          "idleMotion": 0,
          "name": "笨鱼"
        }
      ],
      "companionProps": [
        {
          "propId": "name_plate",
          "x": 650,
          "y": 460,
          "scale": 0.85,
          "fromLine": 8,
          "state": {
            "title": "熟练掌握所有岗位",
            "text": "熟练掌握所有岗位",
            "sub": ""
          }
        }
      ],
      "interactions": [],
      "direction": {
        "kind": "reaction",
        "focus": "本鲸对万能经历的判断",
        "entry": "本鲸看刚出现的通知，纸在画外同桌落点",
        "action": "万能经历条出现时先看→短停→从思考转震惊/指证→道歉条后不再追着摇头",
        "trigger": "L08「写」",
        "wordLine": 8,
        "wordChar": "写",
        "result": "一口全能经追问站不住脚，不把求职者本人当笑话",
        "resultLine": 9,
        "resultChar": "牛",
        "reaction": "本鲸抓住漏洞，嘴硬拆台，随后视线转笨鱼",
        "exit": "本鲸停止反应，看向右侧帮手纸",
        "transition": "切笨鱼为什么认下这个帮手",
        "continuity": {
          "in": "通知正面、@条、旧岗位都保留",
          "out": "只新增经历/道歉条，人物目光向右"
        },
        "settleSeconds": 0.3,
        "holdSeconds": 0.4
      }
    },
    {
      "id": "C05",
      "fromLine": 11,
      "toLine": 13,
      "framing": "medium_right",
      "mood": "work_cool",
      "actors": [
        {
          "pose": "point",
          "x": 470,
          "y": 600,
          "u": 38,
          "idleMotion": 0,
          "name": "本鲸"
        },
        {
          "pose": "think",
          "x": 810,
          "y": 600,
          "u": 38,
          "idleMotion": 0,
          "name": "笨鱼"
        }
      ],
      "companionProps": [
        {
          "propId": "name_plate",
          "x": 1040,
          "y": 500,
          "scale": 0.85,
          "fromLine": 11,
          "state": {
            "title": "豆包 · 帮手",
            "text": "豆包 · 帮手",
            "sub": ""
          }
        }
      ],
      "interactions": [],
      "direction": {
        "kind": "prop",
        "focus": "认帮手的真实动机是不分米饭",
        "entry": "笨鱼与豆包条在右侧，本鲸看向它",
        "action": "用拉近前后切镜让豆包条落在笨鱼侧；本鲸看条→看笨鱼→“招同事还是护食”反问",
        "trigger": "L11「拉」",
        "wordLine": 11,
        "wordChar": "拉",
        "result": "豆包条与笨鱼建立帮手关系，不要新增豆包立绘或米饭数据",
        "resultLine": 12,
        "resultChar": "饭",
        "reaction": "先静停一拍再反问，不让角色整镜抖动",
        "exit": "豆包条固定在笨鱼右侧，通知仍在原处",
        "transition": "切桌面“可能”和昨日筛选条件",
        "continuity": {
          "in": "豆包条未认领",
          "out": "豆包条留在笨鱼侧，形成协作关系"
        },
        "settleSeconds": 0.3,
        "holdSeconds": 0.4
      }
    },
    {
      "id": "C06",
      "fromLine": 14,
      "toLine": 16,
      "framing": "insert_center",
      "mood": "work_cool",
      "actors": [
        {
          "pose": "point",
          "x": 470,
          "y": 600,
          "u": 38,
          "idleMotion": 0,
          "name": "本鲸"
        },
        {
          "pose": "think",
          "x": 810,
          "y": 600,
          "u": 38,
          "idleMotion": 0,
          "name": "笨鱼"
        }
      ],
      "companionProps": [
        {
          "propId": "notice_board",
          "x": 640,
          "y": 500,
          "scale": 0.85,
          "fromLine": 14,
          "state": {
            "title": "可能换工作",
            "text": "可能换工作",
            "sub": ""
          }
        }
      ],
      "interactions": [
        {
          "verb": "mark_strike",
          "propId": "notice_board",
          "wordLine": 15,
          "wordChar": "划",
          "at": [
            640,
            500
          ],
          "span": "left",
          "slot": 0
        },
        {
          "verb": "mark_strike",
          "propId": "notice_board",
          "wordLine": 16,
          "wordChar": "标",
          "at": [
            640,
            500
          ],
          "span": "right",
          "slot": 1
        }
      ],
      "direction": {
        "kind": "prop",
        "focus": "昨天筛选标记继续有效，可能不是录取",
        "entry": "正面通知在旁，原岗位标记仍有效",
        "action": "固定桌面机位，先看可能状态，再按词点在敲代码/太远太熬条件下划线，线完成后保持",
        "trigger": "L15「划」",
        "wordLine": 15,
        "wordChar": "划",
        "result": "筛选条件可辨，不把“可能”改成真实录取",
        "resultLine": 16,
        "resultChar": "标",
        "reaction": "本鲸的判断由条件结果承担，不插无关角色动作",
        "exit": "旧条件与新划线留桌",
        "transition": "通知正面→翻面前后连续性切镜",
        "continuity": {
          "in": "旧条件标记保留",
          "out": "同一张条件纸增加明确划线"
        },
        "settleSeconds": 0.3,
        "holdSeconds": 0.4
      }
    },
    {
      "id": "C07",
      "fromLine": 17,
      "toLine": 18,
      "framing": "medium_left",
      "mood": "work_cool",
      "actors": [
        {
          "pose": "point",
          "x": 470,
          "y": 600,
          "u": 38,
          "idleMotion": 0,
          "name": "本鲸"
        }
      ],
      "companionProps": [
        {
          "propId": "folded_page",
          "x": 640,
          "y": 500,
          "scale": 0.85,
          "fromLine": 17,
          "state": {
            "title": "录取通知",
            "sub": "正面"
          },
          "carry": true,
          "stateChanges": [
            {
              "line": 17,
              "delay": 1.2,
              "state": {
                "title": "筛岗位",
                "sub": "背面 · 对要求"
              }
            }
          ]
        }
      ],
      "interactions": [],
      "direction": {
        "kind": "prop",
        "focus": "把夸口的通知重用于筛岗位",
        "entry": "通知正面在同桌位置",
        "action": "正面→可信前后切镜为背面筛选纸；同一落点，缺翻纸素材不得画假手。主角指回要求",
        "trigger": "L17「翻」",
        "wordLine": 17,
        "wordChar": "翻",
        "result": "通知背面变成待核要求纸，工作继续",
        "resultLine": 17,
        "resultChar": "筛",
        "reaction": "本鲸纠正而不是只说不收",
        "exit": "背面朝上，手退出纸边安全区",
        "transition": "保留背面落点，切双人协作",
        "continuity": {
          "in": "通知正面",
          "out": "通知背面朝上、要求待核"
        },
        "settleSeconds": 0.3,
        "holdSeconds": 0.4
      },
      "foregroundTable": {
        "x": 430,
        "y": 534,
        "width": 420
      },
      "camera": {
        "cy": 420
      }
    },
    {
      "id": "C08",
      "fromLine": 19,
      "toLine": 22,
      "framing": "two_shot",
      "mood": "work_cool",
      "actors": [
        {
          "pose": "point",
          "x": 470,
          "y": 600,
          "u": 38,
          "idleMotion": 0,
          "name": "本鲸"
        },
        {
          "pose": "think",
          "x": 810,
          "y": 600,
          "u": 38,
          "idleMotion": 0,
          "name": "笨鱼"
        }
      ],
      "companionProps": [
        {
          "propId": "folded_page",
          "x": 640,
          "y": 500,
          "scale": 0.85,
          "fromLine": 19,
          "state": {
            "title": "岗位要求",
            "text": "岗位要求",
            "sub": ""
          }
        },
        {
          "propId": "name_plate",
          "x": 1040,
          "y": 450,
          "scale": 0.85,
          "fromLine": 19,
          "state": {
            "title": "豆包 · 帮手",
            "text": "豆包 · 帮手",
            "sub": ""
          }
        },
        {
          "propId": "notice_board",
          "x": 660,
          "y": 360,
          "scale": 0.85,
          "fromLine": 20,
          "state": {
            "title": "不确定的先圈出",
            "text": "不确定的先圈出",
            "sub": ""
          }
        }
      ],
      "interactions": [],
      "direction": {
        "kind": "prop",
        "focus": "笨鱼把要求交给豆包，豆包圈出疑点",
        "entry": "背面要求纸在桌，豆包条在笨鱼侧",
        "action": "笨鱼按旧标记→要求纸前后切镜靠向豆包条→再出疑点圈记；手掌/纸边接触待素材校准",
        "trigger": "L19「推」",
        "wordLine": 19,
        "wordChar": "推",
        "result": "筛过的与待核对的分开，挑好的移向老大方向；不宣布找到工作",
        "resultLine": 20,
        "resultChar": "圈",
        "reaction": "本鲸先看圈记，再把选择权交回老大",
        "exit": "豆包条仍在笨鱼侧，疑点纸与候选纸都保留",
        "transition": "留待核项接下一镜收束",
        "continuity": {
          "in": "要求未核",
          "out": "候选与待核分开，帮手仍在"
        },
        "settleSeconds": 0.3,
        "holdSeconds": 0.4
      }
    },
    {
      "id": "C09",
      "fromLine": 23,
      "toLine": 25,
      "framing": "wide",
      "mood": "work_cool",
      "actors": [
        {
          "pose": "point",
          "x": 470,
          "y": 600,
          "u": 38,
          "idleMotion": 0,
          "name": "本鲸",
          "poses": [
            {
              "line": 25,
              "pose": "shock"
            }
          ]
        },
        {
          "pose": "think",
          "x": 810,
          "y": 600,
          "u": 38,
          "idleMotion": 0,
          "name": "笨鱼"
        }
      ],
      "companionProps": [
        {
          "propId": "folded_page",
          "x": 640,
          "y": 500,
          "scale": 0.85,
          "fromLine": 23,
          "state": {
            "title": "待核要求",
            "text": "待核要求",
            "sub": ""
          }
        },
        {
          "propId": "name_plate",
          "x": 1040,
          "y": 450,
          "scale": 0.85,
          "fromLine": 23,
          "state": {
            "title": "豆包 · 帮手",
            "text": "豆包 · 帮手",
            "sub": ""
          }
        }
      ],
      "interactions": [],
      "direction": {
        "kind": "reaction",
        "focus": "具体未完成任务与米饭/大饼回扣",
        "entry": "候选纸和疑点纸留桌，帮手关系保留",
        "action": "只拉远一次并停稳；末句本鲸由指证切震惊姿态，结尾留理解时间，不假称已完成视线或口型动画",
        "trigger": "L23「还」",
        "wordLine": 23,
        "wordChar": "还",
        "result": "能摇人仍需核对；不吃米饭不代表可以吃大饼，待核项留给下集",
        "resultLine": 25,
        "resultChar": "米",
        "reaction": "米饭/大饼末句切震惊姿态一次，结果收住，不循环点头或全身摆动",
        "exit": "人物和纸的落点稳定，无数据片尾卡",
        "transition": "此处结束，下集从待核项开始",
        "continuity": {
          "in": "候选与疑点都在",
          "out": "不删除帮手，待核项保留"
        },
        "settleSeconds": 0.3,
        "holdSeconds": 0.75
      },
      "camera": {
        "z": 1.12,
        "cx": 640,
        "cy": 390
      },
      "push": {
        "line": 23,
        "duration": 0.8,
        "z": 1.02,
        "cx": 640,
        "cy": 378
      },
      "foregroundTable": {
        "x": 430,
        "y": 534,
        "width": 420
      }
    }
  ]
};

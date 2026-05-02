# 免费二次元 / 像素风人物与动作素材清单（2026-05-02 检索）

下面是可直接用于补充本项目人物、动作和技能动画的**免费素材来源**（重点选了有明确免费入口的站点/资源页）。

## 1) 像素角色（含动作帧）

- **PIPOYA FREE RPG Character Sprites 32x32**（4方向行走）  
  https://pipoya.itch.io/  
  说明：Pipoya 主页可见多个 `FREE` 角色包、怪物包、VFX 包，适合RPG/俯视角项目。

- **FREE - 2D Pixel Art Male and Female Character - Sidescroller**（7类动画）  
  https://gandalfhardcore.itch.io/2d-pixel-art-male-and-female-character  
  说明：包含 Idle/Walk/Run/Jump/Fall/Attack/Death，支持“Name your own price（可0元）”。

- **OpenGameArt - RPG character sprites**（像素角色模板）  
  https://opengameart.org/content/rpg-character-sprites  
  说明：OpenGameArt 站内可继续扩展同类 CC0 / OGA-BY 资源。

- **Universal LPC Sprite Sheet Generator**（在线生成角色精灵表）  
  https://lpc.4wall.ai/  
  说明：可快速拼装不同外观角色并导出 spritesheet，适合批量角色变体。

## 2) 二次元风素材入口

- **itch.io Anime + Sprites + spritesheet（免费筛选页）**  
  https://itch.io/game-assets/free/tag-anime/tag-sprites/tag-spritesheet  
  说明：可快速筛选“二次元 + 精灵图 + 免费”的角色包（建议逐条核对许可证）。

- **Free Pixel Schoolgirls Anime Character Sprite**  
  https://free-game-assets.itch.io/free-schoolgirls-anime-character-pixel-sprite-pack  
  说明：偏二次元校园像素风，可作为NPC或换皮角色素材。

## 3) 动效/技能动画补充（像素VFX）

- **PIPOYA FREE VFX 系列（多种技能特效）**  
  https://pipoya.itch.io/  
  说明：主页可见 Light Pillar / Warp Portal / Hex Shield 等免费 VFX spritesheet，适合替换当前程序化特效。

## 4) 接入你当前项目的建议（最省事）

1. 先统一角色规格（推荐 32x32 或 48x48）。
2. 每个角色至少保证：`idle / walk / attack / hurt / death` 五套动画。
3. 现有 `game.js` 已有技能触发时机，可直接在释放技能时叠加 VFX spritesheet 播放。
4. 下载前确认：
   - 是否允许商用
   - 是否要求署名
   - 是否禁止二次分发
   - 是否限制 AI/NFT 使用

## 5) 版权与许可证提醒

- 即使“免费”，不同资源的许可证差异很大。请在**每个资源页**二次确认授权条款。  
- 尤其是 itch.io 的独立作者资源，常见限制是：允许进游戏、但不允许转卖素材包本身。

---

如果你要，我下一步可以直接帮你：
- 选一套统一风格（偏二次元 or 偏纯像素RPG）；
- 给 `game.js` 加上**逐帧角色动画系统**（idle/walk/attack/death）；
- 接一套免费技能特效 spritesheet，并在技能1/技能2里播放。


## 6) 结构化素材索引

- 仓库新增 `asset-sources.json`，可供后续脚本/工具直接读取并自动化筛选素材。

- 现在程序已支持本地素材入口：`game.js` 会优先读取 `assets/p1.svg` 与 `assets/p2.svg`，不存在时回退为色块绘制。

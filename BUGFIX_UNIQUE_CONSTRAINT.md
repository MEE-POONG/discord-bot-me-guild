# 🐛 Bugfix: Unique Constraint Error - Music Bot Assignment

## ปัญหา

เมื่อมีการซื้อ package หรือ Music Bot add-on ระบบพยายาม assign Music Bots แต่เกิด error:

```
Unique constraint failed on the constraint: `ServerMusicBotDB_serverId_musicBotId_key`
```

### สาเหตุ

1. มี unique constraint บน `serverId` + `musicBotId` ในตาราง `ServerMusicBotDB`
2. เมื่อเซิร์ฟเวอร์เคยซื้อ package มาก่อนและ bot ถูก assign ไว้แล้ว
3. ถ้ามีการซื้อ package ใหม่หรือ add-on ระบบจะพยายาม assign bot ตัวเดิมอีกครั้ง
4. เกิด error เพราะพยายาม `CREATE` record ที่มี serverId + musicBotId ซ้ำกัน

### ตัวอย่าง Log Error

```
[PaymentService] [assignMusicBotsForPackage] Assigning 5 music bots to guild 1170370117708828712
[MusicBotService] [assignBotsToGuild] Assigning 5 bots to guild 1170370117708828712
[MusicBotService] [assignBotsToGuild] Found 0 existing assignments (limit: 5)
[MusicBotService] [getAvailableBots] Requesting 5 bots

❌ Unique constraint failed on the constraint: `ServerMusicBotDB_serverId_musicBotId_key`
```

---

## 🔧 การแก้ไข

### 1. ปรับปรุง `getAvailableBots()`

**เดิม:**
- เลือก bot ที่ว่างโดยไม่คำนึงถึงว่ามี relationship กับ guild หรือไม่

**ใหม่:**
```typescript
async getAvailableBots(count: number, guildId?: string, excludeBotIds: string[] = [])
```
- เพิ่ม parameter `guildId` เพื่อ filter bot ที่ assign ให้ guild นั้นแล้ว
- เพิ่ม parameter `excludeBotIds` เพื่อ filter bot เพิ่มเติม
- **Filter ออกทุก status** (ACTIVE, PENDING_INVITE, REMOVED) เพื่อป้องกัน unique constraint error

### 2. ปรับปรุง `assignBotsToGuild()`

**เดิม:**
- หา available bots แล้ว `CREATE` record ทันที

**ใหม่:**
1. **Reactivate bot ที่เคยถูก REMOVED ก่อน**
   ```typescript
   // หา bot ที่เคย assign ไว้แล้วแต่ถูก REMOVED
   const removedAssignments = await this.prisma.serverMusicBotDB.findMany({
     where: {
       serverId: guildId,
       status: ServerMusicBotStatus.REMOVED,
     },
   });
   
   // Reactivate แทนการ CREATE ใหม่
   await this.prisma.serverMusicBotDB.update({
     where: { id: removed.id },
     data: {
       status: ServerMusicBotStatus.PENDING_INVITE,
       assignedAt: new Date(),
       activatedAt: null,
       removedAt: null,
     },
   });
   ```

2. **ถ้ายังไม่พอ ค่อยหา bot ใหม่**
   ```typescript
   const stillNeeded = neededBots - reactivatedAssignments.length;
   if (stillNeeded > 0) {
     const availableBots = await this.getAvailableBots(stillNeeded, guildId);
     // CREATE record ใหม่สำหรับ bot ใหม่
   }
   ```

---

## 📊 Flow Chart

### ก่อนแก้ไข

```
ซื้อ Package
    ↓
assignBotsToGuild(guildId, 5)
    ↓
getAvailableBots(5) → คืน bot 5 ตัว (อาจมี bot ที่ assign ไว้แล้ว)
    ↓
CREATE record 5 ตัว
    ↓
❌ ERROR: Unique constraint (bot บางตัวมี relationship แล้ว)
```

### หลังแก้ไข

```
ซื้อ Package
    ↓
assignBotsToGuild(guildId, 5)
    ↓
1. หา bot ที่เป็น REMOVED (เช่น 2 ตัว)
    ↓
   UPDATE status → PENDING_INVITE (2 ตัว)
    ↓
2. ยังขาดอีก 3 ตัว
    ↓
   getAvailableBots(3, guildId) → คืน bot ใหม่ที่ไม่มี relationship (3 ตัว)
    ↓
   CREATE record ใหม่ (3 ตัว)
    ↓
✅ SUCCESS: รวม 5 ตัว (2 reactivated + 3 ใหม่)
```

---

## 🎯 ข้อดีของการแก้ไข

### 1. **ป้องกัน Unique Constraint Error**
- ไม่พยายาม CREATE record ที่มี serverId + musicBotId ซ้ำ
- Filter bot ที่มี relationship กับ guild ออกก่อน

### 2. **Reuse Bot ที่เคยใช้แล้ว**
- ประหยัด bot resources
- Bot ที่เคยถูก REMOVED จะถูก reactivate แทนการสร้างใหม่

### 3. **Log ชัดเจนขึ้น**
```
[assignBotsToGuild] Reactivating 2 previously removed bots
[assignBotsToGuild] Assigning 3 new bots
[assignBotsToGuild] Successfully assigned 2 reactivated + 3 new bots. Total: 5
```

### 4. **จัดการ Edge Cases**
- ถ้า bot ที่ REMOVED ไม่พอ จะหา bot ใหม่เพิ่ม
- ถ้าไม่มี bot ใหม่ จะ return bot ที่มีอยู่ (ไม่ throw error)

---

## 🧪 การทดสอบ

### Test Case 1: ซื้อ Package ครั้งแรก
```
1. Server ยังไม่เคยมี Music Bot
2. ซื้อ Package 2 (2 bots)
3. ✅ Assign bot ใหม่ 2 ตัวสำเร็จ
```

### Test Case 2: ซื้อ Package ครั้งที่ 2 (Upgrade)
```
1. Server มี Music Bot 2 ตัว (ACTIVE)
2. Upgrade เป็น Package 4 (5 bots)
3. ✅ Assign bot ใหม่เพิ่มอีก 3 ตัวสำเร็จ
```

### Test Case 3: Bot เคย Removed แล้วซื้อใหม่
```
1. Server มี Music Bot 2 ตัว (REMOVED)
2. ซื้อ Package 2 (2 bots)
3. ✅ Reactivate bot เดิม 2 ตัวสำเร็จ (ไม่ assign ใหม่)
```

### Test Case 4: Mix Reactivate + New
```
1. Server มี Music Bot 2 ตัว (REMOVED)
2. ซื้อ Package 4 (5 bots)
3. ✅ Reactivate 2 ตัว + Assign ใหม่ 3 ตัว = รวม 5 ตัวสำเร็จ
```

---

## 📝 ไฟล์ที่แก้ไข

### `src/music-bot/music-bot.service.ts`

#### 1. `getAvailableBots()`
- เพิ่ม parameters: `guildId`, `excludeBotIds`
- Filter bot ที่มี relationship กับ guild ออก

#### 2. `assignBotsToGuild()`
- เพิ่มการ reactivate bot ที่เป็น REMOVED ก่อน
- แยก logic: reactivate → assign new
- ปรับปรุง log ให้ชัดเจนขึ้น

---

## 🔍 Code Changes

### getAvailableBots()

```typescript
// ❌ เดิม: ไม่ filter guild
async getAvailableBots(count: number) {
  const bots = await this.prisma.musicBotDB.findMany({
    where: { isActive: true, ... },
  });
  return bots;
}

// ✅ ใหม่: filter bot ที่มี relationship กับ guild
async getAvailableBots(count: number, guildId?: string, excludeBotIds: string[] = []) {
  let assignedBotIds: string[] = [...excludeBotIds];
  if (guildId) {
    const assignedBots = await this.prisma.serverMusicBotDB.findMany({
      where: { serverId: guildId }, // ทุก status
      select: { musicBotId: true },
    });
    assignedBotIds = [...assignedBotIds, ...assignedBots.map(ab => ab.musicBotId)];
  }
  
  const bots = await this.prisma.musicBotDB.findMany({
    where: {
      isActive: true,
      ...(assignedBotIds.length > 0 ? { id: { notIn: assignedBotIds } } : {}),
      ...
    },
  });
  return bots;
}
```

### assignBotsToGuild()

```typescript
// ✅ ใหม่: Reactivate ก่อน
// 1. หา bot ที่เคย assign ไว้แล้วแต่ถูก REMOVED
const removedAssignments = await this.prisma.serverMusicBotDB.findMany({
  where: { serverId: guildId, status: ServerMusicBotStatus.REMOVED },
  take: neededBots,
});

// Reactivate
for (const removed of removedAssignments) {
  await this.prisma.serverMusicBotDB.update({
    where: { id: removed.id },
    data: { status: ServerMusicBotStatus.PENDING_INVITE, ... },
  });
}

// 2. ถ้ายังไม่พอ หา bot ใหม่
const stillNeeded = neededBots - reactivatedAssignments.length;
if (stillNeeded > 0) {
  const availableBots = await this.getAvailableBots(stillNeeded, guildId);
  // CREATE record ใหม่
}
```

---

## 📊 Performance Impact

- **ก่อน:** Query 1 ครั้ง → ERROR
- **หลัง:** Query 2-3 ครั้ง → SUCCESS
  1. Query หา REMOVED bots
  2. Query หา available bots (ถ้ายังไม่พอ)
  3. Update/Create records

**Trade-off:** เพิ่ม query เล็กน้อย แต่แก้ปัญหา unique constraint error ได้สำเร็จ

---

## ✅ Checklist

- [x] แก้ไข `getAvailableBots()` ให้ filter guild
- [x] แก้ไข `assignBotsToGuild()` ให้ reactivate ก่อน
- [x] เพิ่ม logging ที่ชัดเจน
- [x] ทดสอบ build สำเร็จ
- [x] ไม่มี linter errors
- [x] Schema sync กับ database แล้ว

---

## 🚀 Deployment

```bash
# 1. Build project
pnpm run build

# 2. Restart bot
pnpm run start:prod

# 3. Monitor logs
tail -f logs/bot.log
```

---

## 📞 Support

หากยังมีปัญหา:
1. ตรวจสอบ log ว่ามี error อื่นหรือไม่
2. ตรวจสอบ database ว่า bot ถูก assign ถูกต้องหรือไม่
3. ทดสอบซื้อ package ใหม่อีกครั้ง

---

**แก้ไขเมื่อ:** 22 พฤศจิกายน 2025  
**Bug:** Unique Constraint Error  
**Status:** ✅ Fixed  
**ผู้แก้ไข:** Warayut Taekrathok


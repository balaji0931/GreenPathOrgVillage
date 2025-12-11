// import { db } from "../server/db";
// import { villages, households } from "../shared/schema";
// import { eq, sql, like, ne, and, isNotNull } from "drizzle-orm";

// async function migrateWards() {
//   console.log("Starting ward migration...");
  
//   const allVillages = await db.select().from(villages);
//   console.log(`Found ${allVillages.length} villages`);
  
//   for (const village of allVillages) {
//     const householdWards = await db
//       .selectDistinct({ ward: households.ward })
//       .from(households)
//       .where(
//         and(
//           eq(households.villageId, village.villageId),
//           isNotNull(households.ward),
//           sql`${households.ward} != ''`
//         )
//       );
    
//     const wards = householdWards
//       .map(row => row.ward)
//       .filter((ward): ward is string => ward !== null && ward.trim() !== '')
//       .sort();
    
//     if (wards.length > 0) {
//       await db
//         .update(villages)
//         .set({ wards, updatedAt: new Date() })
//         .where(eq(villages.villageId, village.villageId));
      
//       console.log(`Updated ${village.villageId} with wards: ${wards.join(', ')}`);
//     }
//   }
  
//   console.log("\nWard migration complete!");
  
//   console.log("\nCleaning up placeholder households...");
//   const placeholders = await db
//     .select({ id: households.id, uid: households.uid })
//     .from(households)
//     .where(like(households.headName, 'Ward-Placeholder-%'));
  
//   console.log(`Found ${placeholders.length} placeholder households to delete`);
  
//   for (const placeholder of placeholders) {
//     await db.delete(households).where(eq(households.id, placeholder.id));
//     console.log(`Deleted placeholder: ${placeholder.uid}`);
//   }
  
//   console.log("\nCleanup complete!");
//   process.exit(0);
// }

// migrateWards().catch(err => {
//   console.error("Migration failed:", err);
//   process.exit(1);
// });

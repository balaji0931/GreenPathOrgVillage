import {
    dryWasteSales,
    dryWasteSaleMaterials,
    type DryWasteSale,
    type DryWasteSaleMaterial,
    type InsertDryWasteSale,
    type InsertDryWasteSaleMaterial,
} from "@shared/schema";
import { db } from "../../db";
import { eq, desc, gte, lte, and } from "drizzle-orm";

// =====================================================
// DRY WASTE SALES OPERATIONS (Manager-only)
// =====================================================

export async function createDryWasteSale(sale: InsertDryWasteSale, materials: InsertDryWasteSaleMaterial[]): Promise<DryWasteSale & { materials: DryWasteSaleMaterial[] }> {
    // Calculate total amount from materials
    const totalAmount = materials.reduce((sum, m) => {
        const amount = parseFloat(m.amount as string) || (parseFloat(m.quantityKg as string) * parseFloat(m.ratePerKg as string));
        return sum + amount;
    }, 0);

    const [createdSale] = await db
        .insert(dryWasteSales)
        .values({ ...sale, totalAmount: totalAmount.toFixed(2) })
        .returning();

    // Insert materials with the sale ID
    const materialsToInsert = materials.map(m => ({
        ...m,
        saleId: createdSale.id,
        amount: (parseFloat(m.quantityKg as string) * parseFloat(m.ratePerKg as string)).toFixed(2),
    }));

    const createdMaterials = await db
        .insert(dryWasteSaleMaterials)
        .values(materialsToInsert)
        .returning();

    return { ...createdSale, materials: createdMaterials };
}

export async function getDryWasteSalesByVillage(villageId: string, startDate?: string, endDate?: string): Promise<(DryWasteSale & { materials: DryWasteSaleMaterial[] })[]> {
    let conditions = [eq(dryWasteSales.villageId, villageId)];

    if (startDate) {
        conditions.push(gte(dryWasteSales.saleDate, startDate));
    }
    if (endDate) {
        conditions.push(lte(dryWasteSales.saleDate, endDate));
    }

    const sales = await db
        .select()
        .from(dryWasteSales)
        .where(and(...conditions))
        .orderBy(desc(dryWasteSales.saleDate));

    // Fetch materials for each sale
    const salesWithMaterials = await Promise.all(
        sales.map(async (sale) => {
            const materials = await db
                .select()
                .from(dryWasteSaleMaterials)
                .where(eq(dryWasteSaleMaterials.saleId, sale.id));
            return { ...sale, materials };
        })
    );

    return salesWithMaterials;
}

export async function getDryWasteSaleById(id: number): Promise<(DryWasteSale & { materials: DryWasteSaleMaterial[] }) | undefined> {
    const [sale] = await db
        .select()
        .from(dryWasteSales)
        .where(eq(dryWasteSales.id, id));

    if (!sale) return undefined;

    const materials = await db
        .select()
        .from(dryWasteSaleMaterials)
        .where(eq(dryWasteSaleMaterials.saleId, id));

    return { ...sale, materials };
}

export async function updateDryWasteSale(id: number, saleUpdates: Partial<DryWasteSale>, materials?: InsertDryWasteSaleMaterial[]): Promise<DryWasteSale & { materials: DryWasteSaleMaterial[] }> {
    let totalAmount = saleUpdates.totalAmount;

    // If materials are provided, recalculate total and replace them
    if (materials && materials.length > 0) {
        totalAmount = materials.reduce((sum, m) => {
            const amount = parseFloat(m.quantityKg as string) * parseFloat(m.ratePerKg as string);
            return sum + amount;
        }, 0).toFixed(2);

        // Delete old materials
        await db.delete(dryWasteSaleMaterials).where(eq(dryWasteSaleMaterials.saleId, id));

        // Insert new materials
        const materialsToInsert = materials.map(m => ({
            ...m,
            saleId: id,
            amount: (parseFloat(m.quantityKg as string) * parseFloat(m.ratePerKg as string)).toFixed(2),
        }));

        await db.insert(dryWasteSaleMaterials).values(materialsToInsert);
    }

    const [updatedSale] = await db
        .update(dryWasteSales)
        .set({ ...saleUpdates, totalAmount, updatedAt: new Date() })
        .where(eq(dryWasteSales.id, id))
        .returning();

    const updatedMaterials = await db
        .select()
        .from(dryWasteSaleMaterials)
        .where(eq(dryWasteSaleMaterials.saleId, id));

    return { ...updatedSale, materials: updatedMaterials };
}

export async function deleteDryWasteSale(id: number): Promise<void> {
    // Materials will be deleted by cascade
    await db.delete(dryWasteSales).where(eq(dryWasteSales.id, id));
}

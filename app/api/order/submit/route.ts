import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/qr-utils";
import { customerOrderSubmitSchema } from "@/lib/validations";
import { DEFAULT_TAX_RATES } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parseResult = customerOrderSubmitSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.errors[0]?.message || "Invalid order submission data",
        },
        { status: 400 }
      );
    }

    const {
      qrToken,
      tableId: requestedTableId,
      orderType,
      customerName,
      customerPhone,
      items: clientItems,
      notes,
      idempotencyKey,
      paymentMethod = "UPI",
      paymentReference,
      paymentStatus = "PENDING",
    } = parseResult.data;

    const mappedPaymentMethod =
      paymentMethod === "CASH"
        ? "CASH"
        : paymentMethod === "CREDIT_CARD" || paymentMethod === "DEBIT_CARD" || paymentMethod === "CARD"
        ? "CREDIT_CARD"
        : "UPI";

    const mappedPaymentStatus = paymentStatus === "PAID" ? "PAID" : "PENDING";

    const resolvedIdempotencyKey =
      idempotencyKey ||
      `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    // 1. Idempotency Check: if order already placed with this key, return it immediately
    if (idempotencyKey) {
      const existingOrder = await prisma.order.findUnique({
        where: { idempotencyKey },
      });

      if (existingOrder) {
        return NextResponse.json({
          success: true,
          message: "Existing order retrieved",
          data: {
            id: existingOrder.id,
            orderNumber: existingOrder.orderNumber,
            status: existingOrder.status,
            total: existingOrder.total,
            submittedAt: existingOrder.submittedAt,
          },
        });
      }
    }

    // 2. Validate QR Token
    const qrRecord = await prisma.restaurantQRCode.findUnique({
      where: { secureToken: qrToken },
      include: {
        business: true,
        branch: true,
        table: true,
      },
    });

    if (!qrRecord) {
      return NextResponse.json(
        { success: false, error: "Invalid QR code. Please scan again." },
        { status: 404 }
      );
    }

    if (!qrRecord.active) {
      return NextResponse.json(
        { success: false, error: "This QR code has been deactivated by the restaurant." },
        { status: 403 }
      );
    }

    // 3. Resolve Table ID
    let resolvedTableId: string | null = null;

    if (qrRecord.type === "TABLE") {
      // For Table QR, table is strictly locked to what was generated
      resolvedTableId = qrRecord.tableId;
      if (!resolvedTableId) {
        return NextResponse.json(
          { success: false, error: "Table configuration missing on this QR code." },
          { status: 400 }
        );
      }
    } else if (orderType === "DINE_IN" && requestedTableId) {
      // For Restaurant QR dining in, verify table belongs to this branch
      const table = await prisma.table.findFirst({
        where: { id: requestedTableId, branchId: qrRecord.branchId, isActive: true },
      });
      if (!table) {
        return NextResponse.json(
          { success: false, error: "Selected table is invalid or not available." },
          { status: 400 }
        );
      }
      resolvedTableId = table.id;
    }

    // 4. Server-Side Price Verification and Item Stock Check
    const menuItemIds = clientItems.map((i) => i.menuItemId);
    const dbMenuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
      },
    });

    const dbItemMap = new Map(dbMenuItems.map((item) => [item.id, item]));

    let calculatedSubtotal = 0;
    const processedOrderItems: Array<{
      menuItemId: string;
      name: string;
      quantity: number;
      price: number;
      variants: Array<{ name: string; price: number }> | null;
      addons: Array<{ name: string; price: number }> | null;
      notes: string | null;
      image?: string;
      isVeg?: boolean;
    }> = [];

    for (const clientItem of clientItems) {
      const dbItem = dbItemMap.get(clientItem.menuItemId);

      if (!dbItem) {
        return NextResponse.json(
          { success: false, error: `One or more menu items were not found.` },
          { status: 400 }
        );
      }

      if (!dbItem.isAvailable) {
        return NextResponse.json(
          { success: false, error: `"${dbItem.name}" is currently unavailable.` },
          { status: 400 }
        );
      }

      let itemPrice = dbItem.price;
      const variantsList: Array<{ name: string; price: number }> = [];
      const addonsList: Array<{ name: string; price: number }> = [];

      // If variant was selected, verify price or use variant
      if (clientItem.selectedVariant) {
        const dbVariants = (dbItem.variants as Array<{ name: string; price: number }>) || [];
        const matchedVariant = dbVariants.find((v) => v.name === clientItem.selectedVariant?.name);
        if (matchedVariant) {
          itemPrice = matchedVariant.price;
          variantsList.push(matchedVariant);
        }
      }

      // If addons were selected, calculate server verified prices
      if (clientItem.selectedAddons && clientItem.selectedAddons.length > 0) {
        const dbAddons = (dbItem.addons as Array<{ name: string; price: number }>) || [];
        for (const addon of clientItem.selectedAddons) {
          const matchedAddon = dbAddons.find((a) => a.name === addon.name);
          if (matchedAddon) {
            itemPrice += matchedAddon.price;
            addonsList.push(matchedAddon);
          }
        }
      }

      const itemLineTotal = itemPrice * clientItem.quantity;
      calculatedSubtotal += itemLineTotal;

      processedOrderItems.push({
        menuItemId: dbItem.id,
        name: dbItem.name,
        quantity: clientItem.quantity,
        price: itemPrice,
        variants: variantsList.length > 0 ? variantsList : null,
        addons: addonsList.length > 0 ? addonsList : null,
        notes: clientItem.notes || null,
        image: dbItem.image || undefined,
        isVeg: dbItem.isVeg,
      });
    }

    // Standard tax calculation (CGST + SGST = 5%)
    const taxRatePercent = DEFAULT_TAX_RATES.CGST + DEFAULT_TAX_RATES.SGST;
    const calculatedTax = Math.round(((calculatedSubtotal * taxRatePercent) / 100) * 100) / 100;
    const calculatedTotal = Math.round((calculatedSubtotal + calculatedTax) * 100) / 100;

    const orderNumber = generateOrderNumber();
    const now = new Date();

    // 5. Atomic Transaction: Create Order, Items, History, and update Table status
    const createdOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          branchId: qrRecord.branchId,
          tableId: resolvedTableId,
          status: "PENDING",
          orderType,
          orderNumber,
          customerName,
          customerPhone,
          items: processedOrderItems,
          subtotal: calculatedSubtotal,
          tax: calculatedTax,
          total: calculatedTotal,
          notes: notes || null,
          idempotencyKey: resolvedIdempotencyKey,
          qrCodeId: qrRecord.id,
          submittedAt: now,
          lastUpdatedAt: now,
        },
      });

      // Insert OrderItem records
      for (const item of processedOrderItems) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: item.price,
            variants: item.variants || undefined,
            addons: item.addons || undefined,
            notes: item.notes,
            status: "PENDING",
          },
        });
      }

      // Generate Bill record
      const billNumber = `BILL-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const bill = await tx.bill.create({
        data: {
          orderId: order.id,
          billNumber,
          subtotal: calculatedSubtotal,
          taxAmount: calculatedTax,
          total: calculatedTotal,
          paymentMethod: mappedPaymentMethod,
          paymentStatus: mappedPaymentStatus,
          paidAt: mappedPaymentStatus === "PAID" ? now : null,
          notes: paymentReference ? `Payment Ref: ${paymentReference}` : null,
        },
      });

      if (mappedPaymentStatus === "PAID") {
        await tx.payment.create({
          data: {
            billId: bill.id,
            restaurantId: qrRecord.businessId,
            method: mappedPaymentMethod,
            amount: calculatedTotal,
            reference: paymentReference || `REF-${Date.now().toString().slice(-6)}`,
            status: "PAID",
          },
        });
      }

      // Record Order Status History
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "PENDING",
          note: `Order submitted via ${qrRecord.type === "TABLE" ? "Table QR" : "Restaurant Menu QR"}. Payment: ${mappedPaymentMethod} (${mappedPaymentStatus}). Customer: ${customerName}`,
        },
      });

      // Update Table Status if dining in
      if (resolvedTableId) {
        await tx.table.update({
          where: { id: resolvedTableId },
          data: {
            status: "OCCUPIED",
            currentOrderId: order.id,
          },
        });
      }

      return {
        ...order,
        paymentMethod: mappedPaymentMethod,
        paymentStatus: mappedPaymentStatus,
        billNumber: bill.billNumber,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Order placed successfully",
      data: {
        id: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        status: createdOrder.status,
        total: createdOrder.total,
        submittedAt: createdOrder.submittedAt,
        tableId: createdOrder.tableId,
        paymentMethod: createdOrder.paymentMethod,
        paymentStatus: createdOrder.paymentStatus,
        billNumber: createdOrder.billNumber,
      },
    });
  } catch (error) {
    console.error("Order submit error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to place order. Please try again." },
      { status: 500 }
    );
  }
}

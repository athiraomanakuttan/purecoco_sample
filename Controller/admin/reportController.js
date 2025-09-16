const orderCollection = require('../../Schema/orderModel')
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const getPieChart = async (req, res) => {
    try {
        const orders = await orderCollection.aggregate([
            { $match: { orderStatus: { $in: ['Confirmed', 'Delivered', 'Shipped','Pending'] } } },
            { $unwind: "$products" },
            {
                $group: {
                    _id: "$products.product_category",
                    totalRevenue: { $sum: { $multiply: ["$products.product_quantity", "$products.product_price"] } }
                }
            }
        ]);
        res.json(orders);
    } catch (err) {
        console.log(err);
        res.json(err);
    }
};

const getSalesByMonth = async (req, res) => {
    try {
        const sales = await orderCollection.aggregate([
            { $match: { orderStatus: { $in: ['Confirmed', 'Delivered', 'Shipped', 'Pending'] } } },
            {
                $group: {
                    _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                    totalSales: { $sum: "$totalPrice" },
                    count: { $sum: 1 }  // Count the number of orders
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1 }
            }
        ]);
        res.json(sales);
    } catch (err) {
        console.log(err);
        res.json(err);
    }
};

const reportPage =async (req,res)=>{
    const totalAmount = await orderCollection.aggregate([
        { $match: { orderStatus: { $in: ['Confirmed', 'Delivered', 'Shipped'] } } },
        { $group: { _id: null, totalPrice: { $sum: "$totalPrice" } } }
    ])
    const totalSales = await orderCollection.find({orderStatus:{$in:['Confirmed', 'Delivered', 'Shipped','Pending']}}).count()
    const totalPrice = totalAmount.length > 0 ? (totalAmount[0].totalPrice).toFixed(2) : 0;

    
    res.render('./admin/report',{totalSales, totalPrice  , dateFormat})
}

const getOrderDetails = async (req, res) => {
    let { startDate, endDate, salesreportType } = req.body;
    let orderDetails;
    let match = {};
    
    try {
        if (!salesreportType) {
            orderDetails = await orderCollection.aggregate([
                {
                    $lookup: {
                        from: 'coupons',
                        localField: 'coupen_id',
                        foreignField: '_id',
                        as: 'coupen_data'
                    }
                },
                {
                    $sort: { createdAt: -1 }
                }
            ])
        } else {
            const now = new Date();
            if (salesreportType === 'custom') {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0); // Set start time to 00:00:00.000
            
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999); // Set end time to 23:59:59.999
            
                match = {
                    createdAt: { $gte: start, $lte: end }
                };
            } else if (salesreportType === 'monthly') {
                endDate = new Date();
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                match = { createdAt: { $gte: startDate, $lte: endDate} };
            } else if (salesreportType === 'yearly') {
                endDate = new Date();
                startDate = new Date(now.getFullYear(), 0, 1);
                match = { createdAt: { $gte: startDate, $lte: endDate } };
            } else if (salesreportType === 'weekly') {
                endDate = new Date();
                const currentDate = new Date();
                const diff = currentDate.getDate() - currentDate.getDay();
                startDate = new Date(currentDate.setDate(diff));
                match = { createdAt: { $gte: startDate, $lte: endDate } };
            }

            orderDetails = await orderCollection.aggregate([
                { $match: match },
                {
                    $lookup: {
                        from: 'coupons',
                        localField: 'coupen_id',
                        foreignField: '_id',
                        as: 'coupen_data'
                    }
                },
                {
                    $sort: { createdAt: -1 }
                }
            ])
        }
        
        console.log(orderDetails);
        res.json(orderDetails);
    } catch (err) {
        console.log(err);
        res.status(400).json(err);
    }
};

// ----------------------------- downloading report --------------------------- 

const downloadPDF = async (req, res) => {
    const { salesreportType, startDate, endDate ,reportType } = req.body;
    let match = {};
    if (salesreportType !== "") {
        match = {
            createdAt: { $lte: new Date(endDate), $gte: new Date(startDate) },
        };
    }

    try {
        let orderDetails = await orderCollection.aggregate([
            { $match: match },
            {
                $lookup: {
                    from: 'coupons',
                    localField: 'coupen_id',
                    foreignField: '_id',
                    as: 'coupen_data'
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        if (orderDetails.length > 0) {
            console.log(reportType,"reportType")
            if(reportType === 'PDF')
            await generatePdf(orderDetails, res);
            else if(reportType === 'EXCEL')
            {
                await generateExcel(orderDetails, res);
            }

        } else {
            res.status(404).json({ message: "No orders found for the specified period." });
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: err.message });
    }
}

const generateExcel = async (orders, res) => {
    console.log("inside this one")
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet 1');

    worksheet.columns = [
        { header: "ORDER ID", key: "orderId", width: 15 },
        { header: "CUSTOMER", key: "customer", width: 25 },
        { header: "ADDRESS", key: "address", width: 30 },
        { header: "QUANTITY", key: "quantity", width: 10 },
        { header: "AMOUNT", key: "amount", width: 15 },
        { header: "PAYMENT", key: "payment", width: 15 },
        { header: "COUPON", key: "coupon", width: 18 },
        { header: "TIME", key: "time", width: 20 },
        { header: "STATUS", key: "status", width: 15 }
    ];

    let totalSale = 0;
    let totalOrders = 0;

    for (const order of orders) {
        const orderId = order.order_id;
        const customer = order.address.customer_name;
        const address = `${order.address.building}, ${order.address.street}, ${order.address.city}, ${order.address.country} - ${order.address.pincode}`;
        const quantity = order.totalQuantity;
        const amount = order.totalPrice;
        const payment = order.paymentMethod;
        const coupon = order.coupen_data.length > 0 ? order.coupen_data[0].coupen_name : 'No Coupon';
        const time = order.createdAt.toLocaleDateString();
        const status = order.orderStatus;

        worksheet.addRow({
            orderId,
            customer,
            address,
            quantity,
            amount,
            payment,
            coupon,
            time,
            status
        });

        totalSale += order.totalPrice;
        totalOrders++;
    }

    worksheet.addRow({}); // Empty row
    const totalRow = worksheet.addRow({
        orderId: "Total",
        customer: "",
        address: "",
        quantity: "",
        amount: totalSale.toFixed(2),
        payment: "",
        coupon: "",
        time: "",
        status: `Total Orders: ${totalOrders}`
    });

    totalRow.eachCell((cell) => {
        cell.font = { bold: true };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const excelBuffer = Buffer.from(buffer);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=sales-report.xlsx");
    res.send(excelBuffer);
};

async function generatePdf(orders, res) {
    const totalOrders = orders.length;
    const totalRevenue = orders
        .filter(order => order.status !== 'pending' && order.status !== 'cancelled' && order.status !== 'returned')
        .reduce((acc, curr) => acc + curr.totalPrice, 0);

    const doc = new PDFDocument();

    const filename = 'sales-report.pdf';

    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    doc.font("Helvetica-Bold").fontSize(26).text("PURE QOQO", { align: "center", margin: 5 });

    doc.moveDown();

    doc.fontSize(10).fillColor("red").text(`Total Revenue : Rs ${totalRevenue.toFixed(2)}`);
    doc.fontSize(10).fillColor("black").text(`Total Orders : ${totalOrders}`);

    doc.moveDown();

    doc.font("Helvetica-Bold").fillColor("black").fontSize(14).text(`Sales Report`, { align: "center", margin: 5 });

    doc.moveDown();

    const tableData = {
        headers: [
            'ORDER ID',
            'CUSTOMER',
            'QUANTITY',
            'AMOUNT',
            'PAYMENT',
            'COUPON',
            'TIME',
            'STATUS'
        ],
        rows: orders.map((order) => {
            return [
                order.order_id,
                order.address.customer_name,
                order.totalQuantity,
                order.totalPrice,
                order.paymentMethod,
                order.coupen_data.length > 0 ? order.coupen_data[0].coupen_name : 'No Coupon',
                order.createdAt.toLocaleDateString(),
                order.orderStatus
            ];
        })
    };

    try {
        await generateTable(doc, tableData);
    } catch (error) {
        console.error('Error generating table:', error); // Log any errors in table generation
    }

    doc.end();
}



function generateTable(doc, tableData) {
    const { headers, rows } = tableData;
    
    // Set up column widths
    const columnWidths = [60, 100, 60, 60, 70, 80, 70, 100, 100];
    
    // Calculate table top position
    const tableTop = 200;
    const rowHeight = 20;
    
    const itemTop = (index) => tableTop + (index + 1) * rowHeight;
    
    // Draw headers
    doc.font('Helvetica-Bold');
    headers.forEach((header, i) => {
        doc.fontSize(10).text(header, 10 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), tableTop);
    });
    
    // Draw rows
    doc.font('Helvetica');
    rows.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            doc.fontSize(8).text(cell, 5 + columnWidths.slice(0, colIndex).reduce((a, b) => a + b, 0), itemTop(rowIndex));
        });
    });
}



function dateFormat(inputDate) {
    
    const formated = new Date(inputDate);
    const options = { year: "numeric", month: "short", day: "numeric" };
    const formattedDate = formated.toLocaleDateString("en-US", options);
    return formattedDate;
  }

module.exports ={
    getPieChart,
    getSalesByMonth,
    reportPage,
    getOrderDetails,
    downloadPDF
}
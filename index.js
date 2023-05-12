const express = require('express')
const { PrismaClient } = require('@prisma/client')
const {convertJsonToExcel} = require('./utils/jsonToExcel');
const {sendWebhook} = require('./utils/webhook')
// const { v4: uuidv4 } = require('uuid')
const {pdfMerge} = require('./utils/pdfMerge')
const {logger} = require('./utils/logger') 

const prisma = new PrismaClient({
  errorFormat: "pretty",
})

const app = express()

function isAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth === process.env.API_KEY) {
    next();
  } else {
    res.status(401);
    res.send('Access forbidden');
  }
}

function isAdmin(req, res, next) {
  const auth = req.headers.admin;
  if (auth === process.env.ADMIN_KEY) {
    next();
  } else {
    res.status(401);
    res.send('Access forbidden');
  }
}

// Add CORS headers to allow requests from a specific domain
// TODO: Remove these before making live
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://127.0.0.1:5500"); // Update this with the domain of your frontend application
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(express.json({limit: '50mb'}))

app.get('/excel-dropzone', (req, res) => {
  const page = `
  <!DOCTYPE html>
<html>
<head>
  <title>Excel to JSON Dropzone</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Open+Sans&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700&display=swap');


    html {
      font-family: 'Open Sans', sans-serif;
          color: #34315C;
          background-image: url(https://deltaprintgroup.com/wp-content/uploads/2022/03/DPG_Years-In-Industry_Background-01.jpg)!important;
          background-size: cover;
    }

    h1 {
      font-family: 'Montserrat', sans-serif;
      font-size: 3rem;
      margin: 1rem 0;

    }

    h2 {
      font-family: 'Montserrat', sans-serif;
      font-size: 2rem;
      margin: 1rem 0;
    }

    #excelDropzone {
      border: 5px #F2A900 dashed; 
    }

    .main-body-area {
      max-width: 700px;
      width: 100%;
    }
  </style>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/dropzone/5.9.2/min/dropzone.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.0/xlsx.full.min.js" defer></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/dropzone/5.9.2/min/dropzone.min.js" defer></script>
  <script src="main.js" defer></script>
</head>
<body>
  <div class="main" style="display: flex; justify-content: center;">
    <div class="main-body-area" style="max-width: 700px;">
      <h1>MSI DPG</h1>
      <h2>Excel Dropzone</h2>
      <form action="/upload" class="dropzone" id="excelDropzone"  accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></form>
      <p>Drop sorted Excel files here.</p> 
    </div>
  </div>
</body>
</html>
  `
  res.send(page);
})

app.post('/order', isAuth, async (req, res) => {
  const { sourceOrderId, accountRef, items } = req.body;
try {
  const order = await prisma.order.create({
    data: {
      sourceOrderId,
      accountRef,
      items: {
        create: items.map((item) => ({
          itemTemplate: item.itemTemplate,
          artFrontUrl: item.artFrontUrl,
          artBackUrl: item.artBackUrl,
          shippingAddressName: item.shippingAddressName,
          shippingAddressLine1: item.shippingAddressLine1,
          shippingAddressLine2: item.shippingAddressLine2,
          shippingAddressTown: item.shippingAddressTown,
          shippingAddressState: item.shippingAddressState,
          shippingAddressCountry: item.shippingAddressCountry,
          shippingAddressZipCode: item.shippingAddressZipCode,
          sourceItemId: item.sourceItemId,
        })),
      },
    },
  });
  res.json(order);
} catch (error) {
  res.status(500).json(error)
  console.error(error);
}

});

app.get('/orders', isAuth, async (req, res) => {
  try {
    const orders = await prisma.order.findMany();
    res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving orders' });
  }
})

app.get('/order/:sourceOrderId', isAuth, async (req, res) => {
  const { sourceOrderId } = req.params
  try {
    const orders = await prisma.order.findFirst({
      where: {sourceOrderId: sourceOrderId}
    });
    res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `Error retrieving order ${sourceOrderId}`});
  }
})

app.get('/items', isAuth, async (req, res) => {
    try {
      const items = await prisma.item.findMany();
      res.json(items);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error retrieving items' });
    }
});


app.get('/order-items/:sourceOrderId', isAuth, async (req, res) => {
  const { sourceOrderId } = req.params
  try {
    const items = await prisma.order.findFirst({
      where: {
        sourceOrderId: sourceOrderId // Replace with the specific sourceOrderId you want to query
      }
    }).items();
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving items' });
  }
});

// Get a list of all unbatched items
app.get('/unbatched-items', async (req, res) => {
  try {
    const unbatchedItems = await prisma.item.findMany({
      where: {batchId: "-1"}
    })
    res.json(unbatchedItems);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving unbatched items' });
  }
});

// Get all items in a batch
app.get('/batch/:batchId', async (req, res) => {
  const { batchId } = req.params
  try {
    const batchItems = await prisma.item.findMany({
      where: {batchId: batchId}
    })
    res.json(batchItems)
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `Error retrieving batch ${batchId}`});
  }
})

// Assign all un-assigned items to a new batch
app.put('/batch/assign/:itemTemplate/:batchId', async (req, res) => {
  // TODO: Add webhook to PR
  const { itemTemplate, batchId } = req.params
  try {
    await prisma.item.updateMany({
      where: {
        AND: [
          {batchId: "-1"},
          {itemTemplate: itemTemplate}
        ]
      },
      data: {
        batchId: batchId,
        itemStatus: "batched"
      }
    })
    res.json({ message: `Batch ${batchId} created`});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `Error updating batch ${batchId}`});
  }
})

// Update item status to all items in a batch
app.put('/batch/update/:itemStatus/:batchId', async (req, res) => {
  // TODO: Add webhook to PR
  const {itemStatus, batchId} = req.params
  try {
    await prisma.item.updateMany({
      where: {
        batchId: batchId
      },
      data: {
        itemStatus: itemStatus
      }
    })
    res.json({ message: `Batch ${batchId} updated to ${itemStatus}`});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `Error updating batch ${batchId}`});
  }

})

// Make the excel file to be loaded
app.get('/batch/export/:batchId', async (req, res) => {
  const { batchId } = req.params
  try {
    const batchItems = await prisma.item.findMany({
      where: {batchId: batchId}
    })
    convertJsonToExcel(batchItems, batchId);
    await prisma.item.updateMany({
      where: {
        batchId: batchId
      },
      data: {
        itemStatus: "sorting"
      }
    })
    res.json(batchItems)
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `Error retrieving batch ${batchId}`});
  }
})

app.get('/batch/download/:batchId', async (req, res) => {
  const { batchId } = req.params
  try {
    const batchItems = await prisma.item.findMany({
      where: {batchId: batchId}
    })
    await prisma.item.updateMany({
      where: {
        batchId: batchId
      },
      data: {
        itemStatus: "sorting"
      }
    })
    res.json(batchItems)
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: `Error retrieving batch ${batchId}`});
  }
})

app.post('/batch/upload', async (req, res) => {
  try {
    console.log(req.body)
    res.status(200).json(req.body)    
  } catch (error) {
    console.error('Error updating sheet:', error);
    res.status(500).json({ error: 'Failed to upload sheet' });
  }

})

app.post('batch/pdf/:batchId', async (req, res) => {
  try {
    res.status(200).send("PDF Merge has begun.")
    const {body} = req;
    pdfMerge(body)
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
});

// TODO: Tracking Update from SnailWorks - Whatever they send should be just fine.
app.post('/tracking/update', async (req, res) => {
  // try {
  //   const itemsToUpdate = req.body; // Array of objects in the request body
  //   const updatedItems = [];

  //   for (const item of itemsToUpdate) {
  //     const { id, itemStatus } = item;

  //     // Update the item in the Prisma database
  //     const updatedItem = await prisma.item.update({
  //       where: { id },
  //       data: { itemStatus },
  //     });

  //     updatedItems.push(updatedItem);
  //     console.log(`ID: ${id}, New Status: ${itemStatus}`);
  //   }
  //   logger(updatedItems)
  //   sendWebhook(updatedItems)
  //   res.status(200).send('received');
  // } catch (error) {
  //   console.error('Error updating items:', error);
  //   res.status(500);
  // }
  try {
    const itemsToUpdate = req.body;
    logger(itemsToUpdate)
    res.status(200).send('received');
  } catch (error) {
    console.error('Error updating items:', error);
    res.status(500).send('Call failed');
  }
  

})

app.post('/merge-pdfs', async (req, res) => {
  try {
    res.status(200).send("PDF Merge has begun.")
    const {body} = req;
    pdfMerge(body)
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal server error');
  }
});

app.listen(3000, () => {
  console.log(`  -------------------------------------------------------
   _______  _______  _______  _______  _______  _______  ______    ______  
  |       ||       ||       ||       ||       ||   _   ||    _ |  |      | 
  |    _  ||   _   ||  _____||_     _||       ||  |_|  ||   | ||  |  _    |
  |   |_| ||  | |  || |_____   |   |  |       ||       ||   |_||_ | | |   |
  |    ___||  |_|  ||_____  |  |   |  |      _||       ||    __  || |_|   |
  |   |    |       | _____| |  |   |  |     |_ |   _   ||   |  | ||       |
  |___|    |_______||_______|  |___|  |_______||__| |__||___|  |_||______| 
   ______    __   __  _______  ___   _  __   __  _______                   
  |    _ |  |  | |  ||       ||   | | ||  | |  ||       |                  
  |   | ||  |  | |  ||       ||   |_| ||  | |  ||  _____|                  
  |   |_||_ |  |_|  ||       ||      _||  |_|  || |_____                   
  |    __  ||       ||      _||     |_ |       ||_____  |                  
  |   |  | ||       ||     |_ |    _  ||       | _____| |                  
  |___|  |_||_______||_______||___| |_||_______||_______|                     

  A Dave Blois Joint - 2023 (name subject to change)
  -------------------------------------------------------

  For more information see our documentation on GitHub.

  ...

  `)
  console.log('Ruckus has begun on port 3000')
})
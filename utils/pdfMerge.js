const { PDFDocument, rgb, cmyk, StandardFonts, PDFFont } = require('pdf-lib');
const fontKit = require ('@pdf-lib/fontkit')
require('dotenv').config()
const fs = require('fs');
const bucket = require('../config/firebucket');
const path = require('path');



  async function pdfMerge(body) {
    console.time()

    // Create new PDF document
    const mergedPdf = await PDFDocument.create();
    
    const openSansFile = fs.readFileSync(path.resolve(__dirname, '../resources/fonts/OpenSans-Regular.ttf'));
    const barcodeFile = fs.readFileSync(path.resolve(__dirname, '../resources/fonts/USPSIMBStandard.ttf'));
    
    // Loop through each object in the request body array
    for (const obj of body) {
      // Fetch PDF data from artwork1 URL
      const artwork1Data = await fetch(obj.artFrontUrl).then(res => res.arrayBuffer()).catch(error => console.error(error))
      
      // Fetch PDF data from artwork2 URL
      const artwork2Data = await fetch(obj.artBackUrl).then(res => res.arrayBuffer()).catch(error => console.error(error))
      
      // Load artwork1 and artwork2 PDFs
      const artwork1Pdf = await PDFDocument.load(artwork1Data);
      const artwork2Pdf = await PDFDocument.load(artwork2Data);
      
      // Get first page of artwork1 PDF
      const artwork1Page = artwork1Pdf.getPages()[0];
      artwork1Pdf.registerFontkit(fontKit)


      const openSansFont = await artwork1Pdf.embedFont(openSansFile)
      const barcodeFont = await artwork1Pdf.embedFont(barcodeFile)

      // Add name and reference number as text to artwork1 PDF
      artwork1Page.drawText(`${obj.sourceItemId} - ${obj.shippingAddressName}`, {
        x: 50,
        y: 80,
        size: 12,
        font: openSansFont,
        color: cmyk(0, 0, 0, 1),
      });

      artwork1Page.drawText(obj.shippingAddressLine1, {
        x: 50,
        y: 50,
        size: 12,
        font: openSansFont,
        color: cmyk(0, 0, 0, 1),
      });

      artwork1Page.drawText(`${obj.shippingAddressTown}, ${obj.shippingAddressState}, ${obj.shippingAddressZipCode}`, {
        x: 50,
        y: 30,
        size: 12,
        font: openSansFont,
        color: cmyk(0, 0, 0, 1),
      });

      artwork1Page.drawText("DTTAFADDTTFTDTFTFDTDDADADAFADFATDDFTAAAFDTTADFAAATDFDTDFADDDTDFFT", {
        x: 20,
        y: 20,
        size: 12,
        font: barcodeFont,
        color: cmyk(0, 0, 0, 1),
      });


      // Copy pages from artwork1 and artwork2 to merged PDF document
      const artwork1Pages = await mergedPdf.copyPages(artwork1Pdf, artwork1Pdf.getPageIndices());
      artwork1Pages.forEach(page => mergedPdf.addPage(page));

      const artwork2Pages = await mergedPdf.copyPages(artwork2Pdf, artwork2Pdf.getPageIndices());
      artwork2Pages.forEach(page => mergedPdf.addPage(page));
      console.log(`${obj.sourceItemId} - merged`);
    }

    // Write merged PDF document to file
    const pdfBytes = await mergedPdf.save();
    // const fileName = `order-200.pdf`
    fs.writeFileSync('merged.pdf', pdfBytes);

    // Save merged PDF to Firebase Storage bucket
    // await bucket.file(fileName).save(pdfBytes, {
    //   contentType: 'application/pdf',
    //   metadata: {
    //     cacheControl: 'public, max-age=31536000',
    //   },
    // });
    
    console.timeEnd()
    console.log("Merge Complete!!! - No Errors (at least no obvious ones)");
  }

  module.exports = {
    pdfMerge
  }
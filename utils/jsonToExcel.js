const json2xls = require('json2xls');
const fs = require('fs');

// Function to convert JSON to Excel
function convertJsonToExcel(jsonData, batchId) {
  if (!jsonData || jsonData.length === 0) {
    console.error('JSON data is empty or invalid.');
    return;
  }

  // Get column names dynamically from JSON keys
  const columns = Object.keys(jsonData[0]).reduce((result, key) => {
    result[key] = key;
    return result;
  }, {});

  // Specify data to be written to Excel sheet
  const data = jsonData;

  // Convert JSON to Excel
  const xls = json2xls(data, {fields: columns});
  fs.writeFileSync(`${batchId}.xlsx`, xls, 'binary');

  console.log('Excel sheet created successfully!');
}

module.exports = {
    convertJsonToExcel
};
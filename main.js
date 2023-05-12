// Initialize Dropzone
Dropzone.options.excelDropzone = {
    acceptedFiles: ".xlsx",
    init: function() {
      this.on("addedfile", function(file) {
        // Read the Excel file
        var reader = new FileReader();
        reader.onload = function(e) {
          var data = new Uint8Array(e.target.result);
          var workbook = XLSX.read(data, {type: 'array'});
          var sheetName = workbook.SheetNames[0];
          var sheet = workbook.Sheets[sheetName];
          var json = XLSX.utils.sheet_to_json(sheet);
          // Make POST API call with JSON data
          // TODO: adjust this to the final HTML before launch
          fetch('https://api.citracommunications.com/batch/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(json),
          })
          .then(response => {
            if (response.ok) {
              console.log('Data posted successfully.');
            } else {
              console.error('Error posting data:', response.status);
            }
          })
          .catch(error => {
            console.error('Error posting data:', error);
          });
        };
        reader.readAsArrayBuffer(file);
      });
    }
  };
  
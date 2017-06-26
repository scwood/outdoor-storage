const csvParse = require('csv-parse/lib/sync');
const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');

function checkForFiles(fileNames) {
  return (req, res, next) => {
    const { files } = req;
    if (!files) {
      reportMissingFiles(res, fileNames);
      return;
    }
    const missing = fileNames.filter(name => !(name in files));
    if (missing.length > 0) {
      reportMissingFiles(res, missing);
      return;
    }
    next();
  }
}

function reportMissingFiles(res, missing) {
  res.status(400).send({
    error: `Missing required file(s): ${missing.join(', ')}`
  });
}

function doTransform(req, res) {
  const { unitFile, customerFile, templateFile } = req.files;
  const units = parseCsv(unitFile);
  const unitsByNumber = createHash(units, 'UnitNo');
  const activeUnits = units.filter(u => u.CustID !== '' && u.MODate === '');
  const activeUnitsByNumber = createHash(activeUnits, 'UnitNo');
  const customersById = createHash(parseCsv(customerFile), 'CustID');

  let template = templateFile.data.toString();
  const unitsToReplace = template.match(/\d\d-...../g);

  unitsToReplace.forEach(number => {
    let result;
    if (!(number in unitsByNumber)) {
      // (1) Unit does not exist in database
      result = 'ERROR';
    } else if (number in activeUnitsByNumber) {
      // (2) Unit is being rented by a customer
      const customerId = activeUnitsByNumber[number].CustID;
      const customer = customersById[customerId];
      result = customer.CName;
    } else {
      // (3) Unit is not being rented
      result = '';
    }
    template = template.replace(number, result);
  });

  res.setHeader('Content-type', 'application/octet-stream');
  res.setHeader('Content-disposition', 'attachment; filename=inventory.csv');
  res.send(template);
}

function createHash(arr, key) {
  return arr.reduce((acc, curr) => {
    acc[curr[key]] = curr;
    return acc;
  }, {});
}

function parseCsv(file) {
  return csvParse(file.data.toString(), { columns: true });
}

const app = new express();
const publicPath = path.resolve(__dirname, 'public');

app.use(express.static(publicPath));
app.use(fileUpload());

app.post(
  '/transform',
  checkForFiles(['unitFile', 'customerFile', 'templateFile']),
  doTransform
);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on port ${port}`);
});

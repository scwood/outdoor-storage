function createTransformedFile() {
  var unitFile = getFileById('unitFile')
  var customerFile = getFileById('customerFile')
  var templateFile = getFileById('templateFile')
  Promise.all([
    parseFileAsCsv(unitFile),
    parseFileAsCsv(customerFile),
    parseFileAsText(templateFile)
  ])
    .then(function(parsedFiles) {
      var units = parsedFiles[0].data
      var customers = parsedFiles[1].data
      var template = parsedFiles[2]
      var unitsByNumber = createHash(units, 'UnitNo')
      var activeUnits = units.filter(function (unit) {
        return unit.CustID !== '' && unit.MODate === ''
      })
      var activeUnitsByNumber = createHash(activeUnits, 'UnitNo')
      var customersById = createHash(customers, 'CustID')
      var unitsToReplace = template.match(/\d\d-...../g)
      unitsToReplace.forEach(function (number) {
        var result
        if (!(number in unitsByNumber)) {
          // (1) Unit does not exist in database
          result = 'ERROR'
        } else if (number in activeUnitsByNumber) {
          // (2) Unit is being rented by a customer
          var customerId = activeUnitsByNumber[number].CustID
          var customer = customersById[customerId]
          result = customer.CName
        } else {
          // (3) Unit is not being rented
          result = ''
        }
        result = result.replace(',', '')
        template = template.replace(number, result)
      })
      download('inventory.csv', template)
    })
}

function getFileById(id) {
  return document.getElementById(id).files[0]
}

function parseFileAsCsv(file) {
  return new Promise(function (resolve) {
    Papa.parse(file, {complete: resolve, header: true})
  })
}

function parseFileAsText(file) {
  return new Promise(function (resolve) {
    var fileReader = new FileReader()
    fileReader.onload = function () {
      resolve(fileReader.result)
    }
    fileReader.readAsText(file)
  })
}

function createHash(arr, key) {
  return arr.reduce(function (acc, curr) {
    acc[curr[key]] = curr
    return acc
  }, {})
}

function download(filename, text) {
  var element = document.createElement('a')
  element.setAttribute(
    'href', 'data:text/plaincharset=utf-8,' + encodeURIComponent(text)
  )
  element.setAttribute('download', filename)
  element.style.display = 'none'
  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
}

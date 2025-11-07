const ExcelJS = require('exceljs');

app.get('/download-xls', async (req, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report');

  // Add column headers
  worksheet.columns = [
    { header: 'Region', key: 'region', width: 15 },
    { header: 'Unique Employees', key: 'unique_emps', width: 20 },
    { header: 'Transactions', key: 'transactions', width: 15 },
  ];

  // Example data - replace with your database query results
  const data = [
    { region: 'North', unique_emps: 100, transactions: 200 },
    { region: 'South', unique_emps: 80, transactions: 150 },
  ];

  data.forEach(item => {
    worksheet.addRow(item);
  });

  // Set response headers
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=report.xlsx');

  // Send the workbook
  await workbook.xlsx.write(res);
  res.end();
});


//=============this is for ExcelJS with table formatting, colors
const ExcelJS = require('exceljs');
const cheerio = require('cheerio');
const fs = require('fs');

const htmlContent = `
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Age</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Alice</td>
        <td>30</td>
      </tr>
      <tr>
        <td>Bob</td>
        <td>25</td>
      </tr>
    </tbody>
  </table>
`;

const $ = cheerio.load(htmlContent);
const tableRows = $('table tr');

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Data');

tableRows.each((index, row) => {
  const rowData = [];
  $(row).find('th, td').each((i, cell) => {
    rowData.push($(cell).text());
  });
  worksheet.addRow(rowData);
});

workbook.xlsx.writeFile('output.xlsx')
  .then(() => {
    console.log('Excel file created: output.xlsx');
  })
  .catch(err => {
    console.error('Error creating Excel file:', err);
  });
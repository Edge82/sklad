import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { fontBase64 } from '@/assets/font-base64'

export const exportToPDF = (items: any[]) => {
  const doc = new jsPDF()
  
  // Добавляем шрифт в VFS и регистрируем его
  // Имя файла 'font.ttf' произвольное, главное использовать его в addFont
  doc.addFileToVFS('font.ttf', fontBase64)
  doc.addFont('font.ttf', 'customFont', 'normal')
  doc.setFont('customFont')

  const tableData = items.map((item, index) => [
    index + 1,
    item.name,
    item.category,
    item.quantity,
    item.unit,
    item.price,
    (item.quantity * item.price).toFixed(2)
  ])

  autoTable(doc, {
    head: [['№', 'Название', 'Категория', 'Кол-во', 'Ед. изм.', 'Цена', 'Сумма']],
    body: tableData,
    styles: { 
      font: 'customFont', // Указываем шрифт для таблицы
      fontStyle: 'normal' 
    },
    headStyles: { fillColor: [66, 66, 66] },
    didDrawPage: (data) => {
      doc.setFont('customFont') // Убеждаемся, что шрифт сброшен для каждой страницы
      doc.text('Отчет по складу', 14, 10)
    }
  })

  doc.save('inventory.pdf')
}

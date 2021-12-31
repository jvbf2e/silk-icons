import { parse } from 'csv-parse/sync'
import { stringify } from 'csv-stringify/sync'
import fs from 'fs'
import path from 'path'
import { ICON_CSV, SOURCE_PATH } from './path'

interface IIconProps {
  id: number
  title: string
  name: string
  svg?: string
  tag: string[]
  category: string
  categoryCN: string
  author: string
  rtl: boolean
}

const content = fs.readFileSync(ICON_CSV, 'utf8')
const arr: string[][] = parse(content)

const allIconMap: Record<string, [string, string]> = {}
fs.readdirSync(SOURCE_PATH).forEach((dir) => {
  const dirPath = path.join(SOURCE_PATH, dir)
  if (fs.statSync(dirPath).isDirectory()) {
    fs.readdirSync(dirPath).forEach((file) => {
      const filePath = path.join(dirPath, file)
      const key = path.basename(filePath, '.svg').toLowerCase()
      const svg = fs.readFileSync(filePath, 'utf8')
      if (allIconMap.hasOwnProperty(key)) {
        console.log('图标名称重复：', key)
      } else {
        allIconMap[key] = [dir, svg]
      }
    })
  }
})

const categoryMap: Record<string, string> = {}
arr.slice(1).forEach((item) => {
  categoryMap[item[3]] = item[2]
})

const map: { [key: string]: boolean } = {}
const NEW_CSV: string[][] = arr.slice(0, 1)
let count = 0
let errors: { [key: string]: boolean } = {}
const data: IIconProps[] = []
arr.slice(1).forEach((item, index) => {
  let category = item[1]
  const name = item[3]
  const filePath = path.resolve(SOURCE_PATH, category, `${name}.svg`)
  const result = `${category}/${name}`

  const printErrorMsg = (msg: string, data = result) => {
    console.log(msg, data)
    errors[result] = true
  }

  let svg = ''

  // 校验
  if (!fs.existsSync(filePath)) {
    if (allIconMap[name]) {
      svg = allIconMap[name][1]
      printErrorMsg(
        'svg分类错误：请检查图标分类，真实分类 = ' + allIconMap[name][0]
      )
      const newItem = [...item]
      newItem[3] = allIconMap[name][0]
      newItem[2] = categoryMap[newItem[3]]
      NEW_CSV.push(newItem)
    } else {
      printErrorMsg('svg路径不存在：请检查是否缺失svg或者拼写错误')
      return
    }
  } else {
    svg = fs.readFileSync(filePath, 'utf8')
    NEW_CSV.push(item)
  }

  delete allIconMap[name]

  // 非法字符
  if (/[^\da-z-]/.test(name)) {
    printErrorMsg('svg命名只允许小写字母/连字符/数字')
  }

  // 重复性
  if (!map[name]) {
    map[name] = true
  } else {
    printErrorMsg('svg名字重复')
  }

  if (!/^h[1-6]$/.test(name) && /\d/g.test(name)) {
    printErrorMsg('svg命名出现数字（数字不表意，不推荐）')
  }

  count += 1

  data.push({
    id: index,
    title: item[2],
    name,
    category,
    categoryCN: item[0],
    author: item[8].replace(/[,， ]+/g, ''),
    tag: item[6].split(/[,， ]+/).filter((item) => item.trim()),
    rtl: item[5].trim() === '是',
    svg,
  })
})

console.log('总图标数', count)
console.log('错误图标数', Object.keys(errors).length)

if (Object.keys(allIconMap).length) {
  console.log('没使用图标')
  Object.keys(allIconMap).forEach((key) => {
    console.log(`Category = ${allIconMap[key][0]}; Name = ${key}`)
  })
}

fs.writeFileSync(
  path.resolve(SOURCE_PATH, './icons.json'),
  JSON.stringify(data, null, 4),
  'utf8'
)

data.forEach((item) => delete item.svg)

fs.writeFileSync(
  path.resolve(SOURCE_PATH, './icons-config.json'),
  JSON.stringify(data, null, 4),
  'utf8'
)

fs.writeFileSync(
  path.resolve(SOURCE_PATH, './db-fixed.csv'),
  stringify(NEW_CSV),
  'utf8'
)

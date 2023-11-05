import dayjs from "dayjs";

export function generateDatesFromYearBeginning(){
  const firstDayOfYear = dayjs().startOf('year')
  const today = new Date()

  const dates =[]
  let compareDate = firstDayOfYear.add(203, 'day')

  while (compareDate.isBefore(today)){
    dates.push(compareDate.toDate())
    compareDate = compareDate.add(1,'day')
  }
  return dates
}
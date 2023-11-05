
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from './lib/prisma'
import dayjs from 'dayjs'

export async function appRoutes(app: FastifyInstance){
  //rota que grava os habitos
  app.post('/habits', async (request) => {
    //Utilizando o zod para validar os dados recebidos
    const createHabitBody = z.object({
      title: z.string(),
      weekDays: z.array(
        z.number().min(0).max(6)
        )
    })
    // [0,1,2] => Domingo, Segunda, Terça

    const { title, weekDays } = createHabitBody.parse(request.body)
    //Utilizando o dayjs para pegar o primeiro horario do dia 2023-01-01 00:00:00
    const today = dayjs().startOf('day').toDate()
    await prisma.habit.create({
      data: {
        title,
        created_at: today,
        weekDays: {
          create: weekDays.map(weekDay =>{
            return { 
              week_day: weekDay
            }
          })
        }
      }
    })
  })

  //rota para buscar os detalhes
  app.get('/day', async (request) => {
    const getDayParams = z.object({
      //utilizando o coerce do zod para converter a string recebida para date
      date:z.coerce.date()
    })
 
    //recebendo via query localhost:3333/day?date=2023-01-13
    const { date } = getDayParams.parse(request.query)
    const parsedDate = dayjs(date).startOf('day')

    const weekDay = parsedDate.get('day')

    console.log(date, weekDay)
    //hábitos que já foram completados
    //todos os hábitos possíveis
    const possibleHabits = await prisma.habit.findMany({
      where: {
        created_at: {
          lte:date,
        },
        weekDays: {
          some: {
            week_day:weekDay,
          }
        }
      }
    })

    const day = await prisma.day.findUnique({
      where: {
        date:parsedDate.toDate(),
      },
      include:{
        dayHabits:true
      }
    })

    //Pegando apenas os Id's
    const completedHabits = day?.dayHabits.map(dayHabit =>{
      return dayHabit.habit_id
    }) ?? []

    return { 
      possibleHabits,
      completedHabits
    }
  })

  //completar / não completar um hábito
  app.patch('/habits/:id/toggle', async (request) =>{
    //route param => parâmetro de identificação

    const toggleHabitParams = z.object({
      id: z.string().uuid(),
    })

    const {id} = toggleHabitParams.parse(request.params)

    const toDay = dayjs().startOf('day').toDate()

    let day = await prisma.day.findUnique({
      where:{
        date: toDay,
      }
    })

    if(!day){
      day = await prisma.day.create({
        data:{
          date:toDay,
        }
      })
    }

    //Verificar se o usuário já tinha marcado esse hábito como completo nesse dia
    const dayHabit = await prisma.dayHabit.findUnique({
      where: {
        day_id_habit_id:{
          day_id:day.id,
          habit_id:id,
        }
      }
    })

    if(dayHabit){
      //Se já tinha no banco, preciso então remover
      await prisma.dayHabit.delete({
        where:{
          id:dayHabit.id,
        }
      })
    }else{     
      //completar o habito nesse dia
      await prisma.dayHabit.create({
        data:{
          day_id:day.id,
          habit_id:id,
        }
      })
    }


  })
  
  app.get('/summary', async () => {
    // Query mais complexa, mais condições, relacionamentos => SQL na mão (RAW)
    // Prisma ORM: RAW SQL => SQlite

    const summary = await prisma.$queryRaw`
      SELECT 
        D.id, 
        D.date,
        (
          SELECT 
            cast(count(*) as float)
          FROM day_habits DH
          WHERE 
            DH.day_id = D.id
        ) as completed,
        (
          SELECT 
            cast(count(*) as float)
          FROM habit_week_days HWD
          JOIN habits H
            ON H.id = HWD.habit_id
          WHERE
             HWD.week_day = cast(strftime('%w', D.date/1000.0, 'unixepoch') as int)
             ANd H.created_at <= D.date
        ) as amount
      FROM days D
    `
    return summary
  })
}

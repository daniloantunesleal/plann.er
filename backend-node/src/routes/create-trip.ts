import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { getMailClient } from "../lib/mail";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import nodemailer from "nodemailer";
import { dayjs } from "../lib/dayjs";
import { ClientError } from "../errors/Client-error";
import { env } from "process";

export async function createTrip(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post("/trips", {
        schema: {
            body: z.object({
                destination: z.string().min(4),
                starts_at: z.coerce.date(),
                ends_at: z.coerce.date(),
                owner_name: z.string(),
                owner_email: z.string(),
                emails_to_invite: z.array(z.string().email())
            })
        }
    }, async (req) => {
        const { destination, starts_at, ends_at, owner_email, owner_name, emails_to_invite } = req.body

        if (dayjs(starts_at).isBefore(new Date())) {
            throw new ClientError("Invalid trip start date")
        }

        if (dayjs(ends_at).isBefore(new Date(starts_at))) {
            throw new ClientError("Invalid trip end date")
        }

        const trip = await prisma.trip.create({
            data: {
                destination,
                starts_at,
                ends_at,
                participants: {
                    createMany: {
                        data: [
                            {
                                email: owner_email,
                                name: owner_name,          
                                is_owner: true,
                                is_confirmed: true    
                            },
                            ...emails_to_invite.map(email => ({ email }))
                        ]
                    }
                }
            }
        })

        const formattedStartDate = dayjs(starts_at).format("LL")
        const formattedEndDate = dayjs(ends_at).format("LL")

        const confirmationLink = `${env.API_BASE_URL}/trips/${trip.id}/confirm`

        const mail = await getMailClient()

        const message = await mail.sendMail({
            from: {
                name: "Equipe plann.er",
                address: "oi@plann.er"
            },
            to: {
                name: owner_name,
                address: owner_email
            },
            subject: `Confirme sua viagem para ${destination} em ${formattedStartDate}`,
            html: `
                <div>
                    <p>Você solicitou a criação de uma viagem para <strong>${destination}</strong> nas datas <strong>${formattedStartDate}</strong> até <strong>${formattedEndDate}</strong></p>
                    <br>
                    <p>Para continuar sua viagem clique no link abaixo:</p>
                    <br>
                    <p>
                        <a href="${confirmationLink}">Confirmar viagem</a>
                    </p>
                    <br>
                    <p>Caso você não saiba do que se trata esse e-mail, apenas ignore.</p>
                </div>
            `.trim()
        })

        console.log(nodemailer.getTestMessageUrl(message))

        return {
            tripId: trip.id
        }
    })
}
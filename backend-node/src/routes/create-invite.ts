import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { getMailClient } from "../lib/mail";
import { dayjs } from "../lib/dayjs";
import nodemailer from "nodemailer";
import { ClientError } from "../errors/Client-error";
import { env } from "../env";

export async function createInvite(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post("/trips/:tripId/invites", {
        schema: {
            body: z.object({
                email: z.string().email()
            }),
            params: z.object({
                tripId: z.string().uuid()
            })
        }
    }, async (req) => {
        const { tripId } = req.params
        const { email } = req.body

        const trip = await prisma.trip.findUnique({
            where: {
                id: tripId
            }
        })

        if (!trip) {
            throw new ClientError("Trip not found")
        }

        const participant = await prisma.participant.create({
            data: {
                email,
                trip_id: tripId
            }
        })

        const formattedStartDate = dayjs(trip.starts_at).format("LL")
        const formattedEndDate = dayjs(trip.ends_at).format("LL")

        const mail = await getMailClient()

        const confirmationLink = `${env.API_BASE_URL}/participants/${participant.id}/confirm`

        const message = await mail.sendMail({
            from: {
                name: "Equipe plann.er",
                address: "oi@plann.er"
            },
            to: participant.email,
            subject: `Confirme sua presença para ${trip.destination} em ${formattedStartDate}`,
            html: `
                <div>
                    <p>Você foi convidado(a) para participar de uma viagem para <strong>${trip.destination}</strong> nas datas <strong>${formattedStartDate}</strong> até <strong>${formattedEndDate}</strong></p>
                    <br>
                    <p>Para continuar sua presença na viagem clique no link abaixo:</p>
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
            participantId: participant.id
        }
    })
}
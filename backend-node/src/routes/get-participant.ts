import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { ClientError } from "../errors/Client-error";

export async function getParticipant(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().get("/participants/:participantId", {
        schema: {
            params: z.object({
                participantId: z.string().uuid()
            })
        }
    }, async (req) => {
        const { participantId } = req.params

        const participant = await prisma.participant.findUnique({
            select: {
                id: true,
                name: true,
                email: true,
                is_confirmed: true
            },
            where: {
                id: participantId
            }
        })

        if (!participant) {
            throw new ClientError("Participant not found")
        }

        return {
            participant,
        }
    })
}
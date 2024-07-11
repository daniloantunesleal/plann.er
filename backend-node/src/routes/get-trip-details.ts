import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { prisma } from "../lib/prisma";
import { z } from "zod";
import { ClientError } from "../errors/Client-error";

export async function getTripsDetails(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().get("/trips/:tripId", {
        schema: {
            params: z.object({
                tripId: z.string().uuid()
            })
        }
    }, async (req) => {
        const { tripId } = req.params

        const trip = await prisma.trip.findUnique({
            select: {
                id: true,
                destination: true,
                starts_at: true,
                ends_at: true,
                is_confirmed: true
            },
            where: {
                id: tripId
            }
        })

        if (!trip) {
            throw new ClientError("Trip not found")
        }

        return {
            trip,
        }
    })
}
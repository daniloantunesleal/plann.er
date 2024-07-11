import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { prisma } from "../lib/prisma";
import { z } from "zod";

export async function createLink(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post("/trips/:tripId/links", {
        schema: {
            body: z.object({
                title: z.string().min(4),
                url: z.string().url()
            }),
            params: z.object({
                tripId: z.string().uuid()
            })
        }
    }, async (req) => {
        const { tripId } = req.params
        const { title, url } = req.body

        const trip = await prisma.trip.findUnique({
            where: {
                id: tripId
            }
        })

        if (!trip) {
            throw new Error("Trip not found")
        }

        const link = await prisma.link.create({
            data: {
                title,
                url,
                trip_id: tripId
            }
        })

        return {
            linkId: link.id
        }
    })
}
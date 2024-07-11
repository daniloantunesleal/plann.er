import type { FastifyInstance } from "fastify"
import { ClientError } from "./errors/Client-error"
import { ZodError } from "zod"

type FastifyErrorHandler = FastifyInstance["errorHandler"]

export const errorHandler: FastifyErrorHandler = (error, req, reply) => {
    if (error instanceof ZodError){
        return reply.status(400).send({
            message: "Invalid Input",
            errors: error.flatten().fieldErrors
        })
    }
    
    if (error instanceof ClientError) {
        return reply.status(400).send({
            message: error.message
        })
    }
}
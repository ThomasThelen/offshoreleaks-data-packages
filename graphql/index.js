import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { Neo4jGraphQL } from "@neo4j/graphql";
import neo4j from "neo4j-driver";
import fs from "fs";
import dotenv from 'dotenv';
import path, { dirname } from 'path';

// Load contents of .env as environment variables
dotenv.config();

// Load GraphQL type definitions from schema.graphql file
const typeDefs = fs
  .readFileSync(path.join(dirname("./"), "schema.graphql"))
  .toString("utf-8");

async function main() {
  // Establish a connection to neo4j
  let driver
  try {
    driver = neo4j.driver(process.env.NEO4J_URI, neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD))
    await driver.getServerInfo()
    console.log('Connection established')
  } catch(err) {
    console.log(`Connection error\n${err}\nCause: ${err.cause}`)
    return
  }

  // Load the schema
  let schema
  try {
    // Create executable GraphQL schema from GraphQL type definitions,
    // using @neo4j/graphql to autogenerate resolvers
    const neoSchema = new Neo4jGraphQL({
      typeDefs,
      driver,
      debug: true,
    });
    schema = await neoSchema.getSchema();
    } catch (err) {
      console.log(`Failed to get schema\n${err}\nCause: ${err.cause}`)
      return
    }

    // Start the server
    try {
      const server = new ApolloServer({
        schema,
        context: ({ req }) => ({ req }),
        introspection: true
      });

      const { url } = await startStandaloneServer(server, {
        listen: { port: 4000 },
      });
      console.log(`🚀 Server ready at ${url}`);
    } catch (err) {
      console.log(`Failed to start the server\n${err}\nCause: ${err.cause}`)
    }
}
main()
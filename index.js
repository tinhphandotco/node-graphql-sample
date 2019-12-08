const http = require('http');
const express = require("express");

// GraphQL define
const { ApolloServer, gql, ApolloError, PubSub } = require('apollo-server-express');
const pubsub = new PubSub();

const UserSchena = gql`
  type User {
    username: String,
    fullname: String
  }
`

const HelloSchema = gql`
  type Hello {
    name: String,
    age: Int
  }
`;

const RootSchema = gql`
  type Query {
    hello(yourname: String): Hello,
    users: [User]
  }

  type Mutation {
    addUser(username: String!, fullname: String!): User
  }

  type Subscription {
    userAdded: User
  }
`

const resolvers = {
  Query: {
    hello: (parent, args, context, info) => {
      return new Promise((rs, rj) => {
        setTimeout(() => {
          rs({
            name: 'Hello ' + args.yourname || "Guest"
          })
          // rj(new ApolloError("JAJA", 401, {
          //   hello: 'Hello is busy now!'
          // }))
        }, 3000);
      })
    },
    users: () => ([
      {
        username: 'ABC',
        fullname: 'DEF'
      }
    ])
  },

  Mutation: {
    addUser: (parent, args, context, info) => {
      pubsub.publish("USER_ADDED", { userAdded: args });
      return args
    }
  },

  Subscription: {
    userAdded: {
      subscribe: () => pubsub.asyncIterator(["USER_ADDED"]),
    }
  }
};

const server = new ApolloServer({ 
  typeDefs: [
    UserSchena,
    HelloSchema,
    RootSchema
  ], 
  resolvers,
  subscriptions: {
    onConnect: (connectionParams, webSocket) => {
      return {
        currentUser: {
          name: 'guest'
        }
      }
    }
  },
  context: ({ req }) => {
    return {
      database: 'database'
    };
  },
  tracing: true
});

// Express - GraphQL
const app = express();
const port = 3001;

server.applyMiddleware({ app });

const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);

app.get("/", function(req, res) {
  res.render("index");
});

httpServer.listen(port, () => console.log(`Example app listening on port ${port}!`));

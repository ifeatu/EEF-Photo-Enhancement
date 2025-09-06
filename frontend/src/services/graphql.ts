import { createClient, cacheExchange, fetchExchange, gql } from '@urql/vue'

// GraphQL client configuration
export const graphqlClient = createClient({
  url: import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:5992/graphql',
  exchanges: [cacheExchange, fetchExchange],
  requestPolicy: 'cache-and-network',
  fetchOptions: () => {
    const token = localStorage.getItem('authToken')
    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apollo-require-preflight': 'true',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    }
  },
})

// GraphQL queries
export const CREDIT_PACKAGES_QUERY = `
  query GetCreditPackages {
    creditPackages {
      data {
        id
        attributes {
          name
          credits
          price
          description
          isActive
          features
          sortOrder
        }
      }
    }
  }
`

export const USER_PHOTOS_QUERY = `
  query GetUserPhotos($userId: ID!) {
    photos(filters: { user: { id: { eq: $userId } } }) {
      data {
        id
        attributes {
          status
          enhancementType
          processingStarted
          processingCompleted
          originalImage {
            data {
              attributes {
                url
                name
              }
            }
          }
          enhancedImage {
            data {
              attributes {
                url
                name
              }
            }
          }
        }
      }
    }
  }
`

export const USER_PURCHASES_QUERY = `
  query GetUserPurchases($userId: ID!) {
    purchases(filters: { user: { id: { eq: $userId } } }) {
      data {
        id
        attributes {
          amount
          credits
          status
          paymentDate
          creditPackage {
            data {
              attributes {
                name
              }
            }
          }
        }
      }
    }
  }
`

export const CREATE_PHOTO_MUTATION = `
  mutation CreatePhoto($data: PhotoInput!) {
    createPhoto(data: $data) {
      data {
        id
        attributes {
          status
          enhancementType
        }
      }
    }
  }
`

export const UPDATE_USER_MUTATION = gql`
  mutation UpdateUser($id: ID!, $data: UsersPermissionsUserInput!) {
    updateUsersPermissionsUser(id: $id, data: $data) {
      data {
        id
        attributes {
          username
          email
          firstName
          lastName
          credits
        }
      }
    }
  }
`

export const GET_ME_QUERY = gql`
  query GetMe {
    me {
      id
      username
      email
    }
  }
`

export const REGISTER_MUTATION = gql`
  mutation Register($input: UsersPermissionsRegisterInput!) {
    register(input: $input) {
      jwt
      user {
        id
        email
        username
      }
    }
  }
`

export const LOGIN_MUTATION = gql`
  mutation Login($input: UsersPermissionsLoginInput!) {
    login(input: $input) {
      jwt
      user {
        id
        email
        username
      }
    }
  }
`
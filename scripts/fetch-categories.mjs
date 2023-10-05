import {gql, GraphQLClient} from "graphql-request";
import * as fs from "fs";

const STRAPI_TOKEN = process.env.STRAPI_TOKEN;
const SAVE_PATH = 'data/categories/list.json';

const graphQLClient = new GraphQLClient('https://content.subwallet.app/graphql', {
    headers: {
        "Authorization": "Bearer " + STRAPI_TOKEN,
    },
});

const query = gql`
query {
  categories(sort: "id:ASC" pagination: { limit: -1 }) {
    data {
      id
      attributes {
        slug
        name
        color
      }
    }
  }
}
`;

const main = async () => {
    const results = await graphQLClient.request(query);
    const categories = results.categories.data.map(item => {
        return {
            id: item.id,
            slug: item.attributes.slug,
            name: item.attributes.name,
            color: item.attributes.color,
        }
    });

    // save to json file
    fs.writeFile(SAVE_PATH, JSON.stringify(categories, null, 2), function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log("JSON saved to " + SAVE_PATH);
        }
    });
}

main().catch((error) => console.error(error));

import {gql, GraphQLClient} from "graphql-request";
import * as fs from "fs";

const STRAPI_TOKEN = process.env.STRAPI_TOKEN;
const SAVE_PATH = 'data/dapps/list.json';

const graphQLClient = new GraphQLClient('https://content.subwallet.app/graphql', {
    headers: {
        "Authorization": "Bearer " + STRAPI_TOKEN,
    },
});

const query = gql`
# Write your query or mutation here
query {
  dapps(sort: "id:ASC") {
    data {
      id
      attributes {
        title
        subtitle
        url
        categories
        chains 
        is_evm
        is_substrate
        icon {
          data {
            attributes {
              url
            }
          }
        }
        preview_image {
          data {
            attributes {
              url
            }
          }
        }
      }
    }
  }
}
`;

const main = async () => {
    const results = await graphQLClient.request(query);
    const dapps = results.dapps.data.map(dapp => {
        return {
            id: dapp.id,
            title: dapp.attributes.title,
            subtitle: dapp.attributes.subtitle,
            url: dapp.attributes.url,
            categories: dapp.attributes.categories,
            chains: dapp.attributes.chains,
            is_evm: dapp.attributes.is_evm,
            is_substrate: dapp.attributes.is_substrate,
            icon: dapp.attributes.icon.data.attributes.url,
            preview_image: dapp.attributes.preview_image.data.attributes.url
        }
    });

    // save to json file
    fs.writeFile(SAVE_PATH, JSON.stringify(dapps, null, 2), function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log("JSON saved to " + SAVE_PATH);
        }
    });
}

main().catch((error) => console.error(error));
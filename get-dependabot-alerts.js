#!/usr/bin/env node

require('dotenv').config()
const pReduce = require('./lib/p-reduce');
const delay = require('delay');
const {Octokit} = require('@octokit/rest')
const { graphql } = require("@octokit/graphql");

var buffer = ""
const [, , ...args] = process.argv
const org = args[0]

var graphqlWithAuth;
var octokit;
var base_url = ''

if (args.length > 0)
  base_url = args[1]

if (base_url.length > 0)
{
  graphqlWithAuth = graphql.defaults({
    baseUrl: base_url + "/api",
    headers: {
      authorization: 'token ' + process.env.GH_AUTH_TOKEN,
    },
  });

  octokit = new Octokit({
    auth: process.env.GH_AUTH_TOKEN,
    previews: ['dorian-preview'],
    baseUrl: base_url + '/api/v3'
  });
}
else
{
  graphqlWithAuth = graphql.defaults({
    headers: {
      authorization: 'token ' + process.env.GH_AUTH_TOKEN,
    },
  });
  octokit = new Octokit({
    auth: process.env.GH_AUTH_TOKEN,
    previews: ['dorian-preview']
  });

}

console.log("org, repo, created at, dismissed at, package name, vulnerable version, severity, vulnerability id")      

octokit
  .paginate(octokit.repos.listForOrg, {
      org: org,
    })
  .then(repositories =>
    pReduce(repositories, (repository) => {
      if (repository.archived) {
        return Promise.resolve();
      }
      const repo = repository.name
      const query = `
      {
          repository(name: "${repo}", owner: "${org}") {
              vulnerabilityAlerts(first: 100) {
                  nodes {
                      createdAt
                      dismissedAt
                      securityVulnerability {
                          package {
                              name
                          }
                          severity
                          vulnerableVersionRange
                          advisory {
                              ghsaId
                              publishedAt
                              identifiers{
                                type
                                value
                              }
                          }
                      }
                  }
              }
          }
      }`;

      try {
        graphqlWithAuth(query, 
          
          ).then(alerts =>{
                            alerts.repository.vulnerabilityAlerts.nodes.forEach( (node)=> 
                            {console.log(`${org},${repo}, ${node.createdAt,node.createdAt}, ${node.createdAt,node.dismissedAt}, ${node.securityVulnerability.package.name}, ` + 
                              `${node.securityVulnerability.vulnerableVersionRange}, ${node.securityVulnerability.severity},` + 
                              `${node.securityVulnerability.advisory.ghsaId}`)})
          
          });

      } catch (error) {
      

        console.log("Request failed:", error.request); 
        console.log(error.message); 
        console.log(error.data);
      }      
    })
    
  )
  .catch(error => {
    console.error(`Getting repositories for organization ${org} failed.
    ${error.message} (${error.status})
    ${error.documentation_url}`)
  })

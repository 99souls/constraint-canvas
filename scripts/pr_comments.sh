gh api graphql -F node_id="$(gh pr view --json id -q .id)" -f query='
query($node_id: ID!) {
  node(id: $node_id) {
    ... on PullRequest {
      reviewThreads(first: 50) {
        nodes {
          isResolved
          comments(first: 20) {
            nodes {
              author { login }
              body
              path
              line
            }
          }
        }
      }
    }
  }
}' --jq '.data.node.reviewThreads.nodes | map(select(.isResolved == false))'

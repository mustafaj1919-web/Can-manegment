import fs from 'fs'
import path from 'path'

const clientHtmlPath = path.join(process.cwd(), '.next', 'analyze', 'client.html')
if (fs.existsSync(clientHtmlPath)) {
  const content = fs.readFileSync(clientHtmlPath, 'utf8')
  
  // Find script tags
  const scriptRegex = /<script>([\s\S]*?)<\/script>/gi
  let match
  let found = false
  while ((match = scriptRegex.exec(content)) !== null) {
    const scriptContent = match[1]
    console.log("Found script tag of length:", scriptContent.length)
    // Find variables
    const varRegex = /(?:var|let|const|window)\s*(\w+)\s*=/g
    let varMatch
    while ((varMatch = varRegex.exec(scriptContent)) !== null) {
      console.log("  Variable:", varMatch[1])
    }
    found = true
  }
  if (!found) {
    console.log("No <script> tags found.")
  }
} else {
  console.log("Not found")
}

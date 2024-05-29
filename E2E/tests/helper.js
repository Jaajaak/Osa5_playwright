const loginWith = async (page, username, password)  => {
    await page.getByRole('button', { name: 'log in' }).click()
    await page.getByTestId('username').fill(username)
    await page.getByTestId('password').fill(password)
    await page.getByRole('button', { name: 'login' }).click()
}
  
const createBlog = async (page, title, author, url, likes) => {
    await page.getByRole('button', { name: 'new blog' }).click()
    await page.locator('[placeholder="Title"]').fill(title)
    await page.locator('[placeholder="Author"]').fill(author)
    await page.locator('[placeholder="URL"]').fill(url)
    await page.getByRole('button', { name: 'save' }).click()
  }
  
export { loginWith, createBlog }
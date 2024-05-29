const { test, describe, expect, beforeEach, afterEach } = require('@playwright/test')
const { loginWith, createBlog } = require('./helper') // Adjust the path as needed

describe('Blog app', () => {
  beforeEach(async ({ page, request }) => {
    await request.post('/api/testing/reset')
    await request.post('/api/users', {
        data: {
            name: 'Matti Luukkainen',
            username: 'mluukkai',
            password: 'salainen'
        }
    })
    await request.post('/api/users', {
        data: {
          name: 'Testaus',
          username: 'testi',
          password: 'hiiri'
        }
    })
    await page.goto('/')
  })

  test('front page can be opened', async ({ page }) => {
    const locator = await page.getByText('Blogs')
    await expect(locator).toBeVisible()
    await expect(page.getByText('Blog app, Department of Computer Science, University of Helsinki 2024')).toBeVisible()
  })

  test('user can login with correct credentials', async ({ page }) => {
      await loginWith(page, 'mluukkai', 'salainen')
      await expect(page.getByText('Matti Luukkainen logged in')).toBeVisible()
    })

  test('login fails with wrong password', async ({ page }) => {
    await loginWith(page, 'mluukkai', 'wrong')

    const errorDiv = await page.locator('[data-testid="notification"]')
    await expect(errorDiv).toContainText('wrong credentials')
    await expect(await page.getByText('Matti Luukkainen logged in')).not.toBeVisible()
  })  

  describe('when logged in', () => {
    beforeEach(async ({ page, request }) => {
      await loginWith(page, 'mluukkai', 'salainen')
    })

    test('a new blog can be created', async ({ page }) => {
      await createBlog(page, 'a blog created by playwright', 'Matti Luukkainen', 'fakerealurl')

      const notification = await page.locator('[data-testid="notification"]')
      await expect(notification).toContainText('a blog created by playwright')
      await expect(notification).toBeVisible()

      await page.waitForSelector('[data-testid^="blog-"]')

      const blogEntry = await page.locator('[data-testid^="blog-"]', { hasText: 'a blog created by playwright' }).first()
      await expect(blogEntry).toBeVisible()
    })

    describe('and a blog exists', () => {
      beforeEach(async ({ page }) => {
        await createBlog(page, 'existing blog by playwright', 'Matti Luukkainen', 'fakerealurl')
        await createBlog(page, 'Testing likes by playwright', 'Matti Luukkainen', 'osoite', 5)
        await createBlog(page, 'Most likes by playwright', 'Matti Luukkainen', 'fakeosoite', 15)
        await createBlog(page, 'Some likes by playwright', 'Matti Luukkainen', 'fakeosoite', 10)
      })

      test('a blog can be liked', async ({ page }) => {
        const blogEntry = await page.locator('[data-testid^="blog-"]', { hasText: 'existing blog by playwright Matti Luukkainen' }).first()
        await expect(blogEntry).toBeVisible()

        const viewButton = blogEntry.locator('button', { hasText: 'view' })
        await viewButton.click()

        const likeButton = blogEntry.locator('button', { hasText: 'like' })
        const likesText = blogEntry.locator('p', { hasText: 'likes:' })

        const initialLikesText = await likesText.innerText()
        const initialLikes = parseInt(initialLikesText.replace('likes: ', ''), 10)

        await likeButton.click()

        await expect(likesText).toContainText(`likes: ${initialLikes + 1}`)
      })

      test('a blog can be removed by the user who created it', async ({ page }) => {
        const blogEntry = await page.locator('[data-testid^="blog-"]', { hasText: 'existing blog by playwright Matti Luukkainen' }).first()
        await expect(blogEntry).toBeVisible()
        await page.reload()
      
        const viewButton = blogEntry.locator('button', { hasText: 'view' })
        await expect(viewButton).toBeVisible()
        await viewButton.click()
      
        await page.waitForTimeout(1000)
      
        const removeButton = blogEntry.locator('button', { hasText: 'remove' })
        await expect(removeButton).toBeVisible()
      
        page.once('dialog', dialog => dialog.accept())
        
        await removeButton.click()
      
        await expect(blogEntry).not.toBeVisible()
      })

      test('Only the adder of blog can remove', async ({ page }) => {
        const blogEntry = await page.locator('[data-testid^="blog-"]', { hasText: 'existing blog by playwright Matti Luukkainen' }).first()
        await expect(blogEntry).toBeVisible()
        await page.reload()
      
        const viewButton = blogEntry.locator('button', { hasText: 'view' })
        await expect(viewButton).toBeVisible()
        await viewButton.click()
      
        await page.waitForTimeout(1000)
      
        const removeButton = blogEntry.locator('button', { hasText: 'remove' })
        await expect(removeButton).toBeVisible()
      
        const logoutButton = page.locator('button', { hasText: 'logout' })
        await expect(logoutButton).toBeVisible()
        await logoutButton.click()

        await loginWith(page, 'testi', 'hiiri')
        await expect(blogEntry).toBeVisible()

        await expect(viewButton).toBeVisible()
        await viewButton.click()
        await expect(removeButton).not.toBeVisible()

      })

      test('blogs are sorted with the most likes first', async ({ page }) => {
        const blogs = await page.locator('[data-testid^="blog-"]')
        const blogCount = await blogs.count()
      
        let previousLikes = Infinity
        for (let i = 0; i < blogCount; i++) {
          const blog = blogs.nth(i)
          await blog.locator('button', { hasText: 'view' }).click()
          const likesText = await blog.locator('p', { hasText: 'likes:' }).innerText()
          const likes = parseInt(likesText.replace('likes: ', ''), 10)
          expect(likes).toBeLessThanOrEqual(previousLikes)
          previousLikes = likes
        }
      })
    })
  })
})

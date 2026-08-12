import api from "./api"

export interface Category {
  id: string
  name: string
  userId: string | null
}


export async function getCategories() {
  const response = await api.get("/categories")

  return response.data.categories
}

export async function createCategory(name: string): Promise<Category> {
  const response = await api.post("/categories", { name })

  return response.data
}

export async function renameCategory(id: string, name: string): Promise<Category> {
  const response = await api.put(`/categories/${id}`, { name })

  return response.data
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(`/categories/${id}`)
}
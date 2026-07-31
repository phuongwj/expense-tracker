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
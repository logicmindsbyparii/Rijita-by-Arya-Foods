from pydantic import BaseModel, Field
from typing import Optional, List, Any

class VariantSchema(BaseModel):
    weight: str
    weightValue: float
    weightUnit: str = "g"
    mrp: float
    sellingPrice: float
    discount: float = 0
    stock: int = 0
    sku: str
    isActive: bool = True

class NutritionalInfoSchema(BaseModel):
    servingSize: Optional[str] = None
    calories: Optional[float] = None
    totalFat: Optional[float] = None
    saturatedFat: Optional[float] = None
    transFat: Optional[float] = None
    cholesterol: Optional[float] = None
    sodium: Optional[float] = None
    totalCarbohydrates: Optional[float] = None
    dietaryFiber: Optional[float] = None
    sugars: Optional[float] = None
    protein: Optional[float] = None
    vitaminA: Optional[float] = None
    vitaminC: Optional[float] = None
    calcium: Optional[float] = None
    iron: Optional[float] = None

class ProductCreateSchema(BaseModel):
    name: str
    slug: Optional[str] = None
    description: str
    shortDescription: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    brand: Optional[str] = None
    variants: List[VariantSchema] = []
    images: List[str] = []
    videos: List[str] = []
    tags: List[str] = []
    nutritionalInfo: Optional[NutritionalInfoSchema] = None
    ingredients: Optional[str] = None
    shelfLife: Optional[str] = None
    storageInstructions: Optional[str] = None
    countryOfOrigin: Optional[str] = "India"
    fssaiLicense: Optional[str] = None
    gst: float = 5.0
    hsn: Optional[str] = None
    isActive: bool = True
    isFeatured: bool = False
    isBestSeller: bool = False
    isNewArrival: bool = False
    unit: str = "Pcs"
    metaTitle: Optional[str] = None
    metaDescription: Optional[str] = None
    metaKeywords: List[str] = []

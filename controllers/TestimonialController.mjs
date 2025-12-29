import Testimonials from "../models/Testimonials.mjs";

class TestimonialController {
   async addTestimonial(req, res) {
    try {
        const { testimonial, serviceName, userId } = req.body;
        const testimonialData = await Testimonials.create({ testimonial, serviceName, userId });
        res.status(200).json({ message: "Testimonial added successfully", testimonialData });
    } catch (error) {
        res.status(500).json({ message: "Failed to add testimonial", error: error.message });
    }
   } 
   // get all testimonials
   async getAllTestimonials(req, res) {
    try {
        const testimonials = await Testimonials.find();
        res.status(200).json({ message: "Testimonials fetched successfully", testimonials });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch testimonials", error: error.message });
    }
   }
   // get testimonial by id
   async getTestimonialById(req, res) {
    try {
        const { id } = req.params;
        const testimonial = await Testimonials.findById(id);
        if (!testimonial) {
            return res.status(404).json({ message: "Testimonial not found" });
        }
        res.status(200).json({ message: "Testimonial fetched successfully", testimonial });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch testimonial", error: error.message });
    }
   }
   // update testimonial
   async updateTestimonial(req, res) {
    try {
        const { id } = req.params;
        const testimonial = await Testimonials.findByIdAndUpdate(id, req.body, { new: true });
        if (!testimonial) {
            return res.status(404).json({ message: "Testimonial not found" });
        }
        res.status(200).json({ message: "Testimonial updated successfully", testimonial });
    } catch (error) {
        res.status(500).json({ message: "Failed to update testimonial", error: error.message });
    }
   }
   // delete testimonial
   async deleteTestimonial(req, res) {
    try {
        const { id } = req.params;
        const testimonial = await Testimonials.findByIdAndDelete(id);
        if (!testimonial) {
            return res.status(404).json({ message: "Testimonial not found" });
        }
        res.status(200).json({ message: "Testimonial deleted successfully", testimonial });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete testimonial", error: error.message });
    }
   }
}

export default TestimonialController;
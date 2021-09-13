Repo for the project in the introduction to computer graphics course (CS-341) taught at EPFL that I did together with @HaymozJo.
---
# Final Report 
---
by Oskar Hallström and Jonathan Haymoz
---
# Abstract
In the center of the project is a planet. It has several actors on it, the main one being a car with a lot of different attributes; The car can be followed with a camera, it can change speed, light up the scene with its lights as well as it has a noisy movement. Around the planet a sun orbits, which acts as the main light source. In order to get a “cartoonesque” feeling, cell shading and outlining was used.

# Technical approach
## Bloom
The following source was used in order to understand what Bloom is and how it can be implemented. https://learnopengl.com/Advanced-Lighting/Bloom
However, our implementation differs vastly from the one seen on the link. The more or less only thing we used was the vector to calculate the brightness with. Instead of having different shaders, everything was implemented in the same fragment shader. After input from TA last week, we also tried implementing it with a framebuffer. We managed to implement a pipeline with two fragment shaders, in which the first shader was connected to a framebuffer and both shaders input to gl_Fragcolor contributed to the final output on the screen, however we did not have time to retrieve the colors correctly from the texture in the second shader. So we kept our first solution. Instead of a two pass gaussian blur, we used a single one. To minimize blur calculations, we had two thresholds. One lower which made us not even calculate the blur for points that were too dark. The higher threshold was used to decide if the point would contribute with its actual color or black (no color at all) to the gaussian filter. In order to get a brighter sun, which was more aesthetically pleasing, we kept the exact intensity of the gaussian layer.

## Cell shading
We learned about the concept of cell shading from this source: https://en.wikipedia.org/wiki/Cel_shading. However it did not include any implementation details. In order to implement the cell shading we divided the possible contribution of the diffuse and specular component of our phong shading into 4 respectively two discrete values, instead of the previous continuous spectrum of output levels. From the start both components had 4 discrete possible values, but we wanted the spectral component to be more distinct, which was why it was set to two. For both the specular and diffuse component, there is a dot product of two vectors (does not exceed 1) that acts as a coefficient that determines the intensity of the component. The cell shading was implemented by dividing the value of that dot product into different discrete sectors - This was made by the following algorithm:
Multiply the dot product value of the component by the number of discrete values.
Floor the value from 1..
Divide the value from 2. by the number of discrete values.

## Outlining
What we perceive as edges of 3D objects, are the points with normals that are orthogonal to the viewing vector (fragment => camera). Therefore the outline is carried out by special colouring of fragments for which the dot product of its normal and the viewing vector is very small. The threshold value was set by us as an interpolation between 0.1 and 0.3. The value used to interpolate with is the dot product of the normal and the light vector (fragment => light) as long as it’s positive, otherwise it was set to 0. In this way the outlining will be thicker on the shadowed side of the object.
Perlin Noise
All calculations were carried out in the same shader, using our implementation from a previous lab. By creating the perlin noise from the x and y camera coordinates, we get this cool symmetry line on our planet’s “equator”. We took it one step further and implemented marble structure based on perlin noise instead of perlin noise itself. This gave the planet a better look according to us.

## Car Noise
The implementation of Car Noise was made by creating a fromZRotation based on a random angle. We tried around with different rotations and also with different translations, but ended up thinking that a fromZRotation gave the most realistic noise. At first the Noise gave too much fluctuation, which was why we ended up applying a cosine function to the random generator. This combined with a 0.01 coefficient made us able to limit the perturbation angle to a value between -0.01 and 0.01.

cos(PI times random()) times 0.01

## User Interface
We can separate the user interface  between two main parts.
### 1
Toggling between the different Shaders. With the key ‘b’ you can activate the bloom and with the key ‘s’ you can activate the cell shading. When you activate either one, the concerned actors are then using a different shader so it corresponds to their respective implementation.
### 2
The car manipulation interface. With the keys ‘u’ and ‘d’ you can respectively augment or decrease the car speed. With the key ‘l’ you can activate the lights. With the keys ‘f’ and ‘x’ you can get respectively the front or the back view of the car, with the camera following the car.
The main difficulty for this part was to understand how to represent the car position 	as all these things use it. In the end, as the car is going around the planet in a            	straight motion, we can represent it via its angle.
For the car speed, we keep track of the angle at the time of the speed changement. 	In this way, we can then have the position of the car when the speed changed and 	add to it the evolution of the car angle with the simulation time.
The lights were done the same way, by adding an offset to the coordinates and 		following the same angle as the car. We show them by pushing them to the lists of 	lights to show when wanted and popping them out of the list when they are not used.
Finally the camera implementation was also done with the angle position of the car. 	With the look_at function we can create a camera that looks the car or the front of it,	and which is positioned on the top/front of the car.
We defined a function offset_plus_scale, which adds an offset to the car angle  and 	augment the radius of the orbit of the different actors which were related to the car 	movements.

At first the car position was done with a vector, which made the whole care speed 	behavior difficult to use. There’s also a problem with getting the angle from the car 	actor as it is quite heavy on the performance. The vector implementation gave even 	worse results so we had to change it completely so it looks better.

## Scene
The scene is composed of multiple actors which were done/manipulated with blender. Some of them were way more difficult to do so we had to take them already done. As we didn’t have a lot of experience on blender, it was difficult but interesting to take in hand this incredible tool.
We choose to mostly take low-poly meshes as it gives a better “cartoonish” look to the scene, which goes well with the cell-shading.
We had to find particular meshes which worked well with the triangulation of faces. For most of them, the mesh was just a big object so we had to separate the different parts to have the possibility of coloring them ourselves. The car, aliens and rocket  were from free3d.com (see meshes in references)  and the other ones were made by hand.
We had a lot of problems exporting the meshes at  first, we did it like exercise 5 but it wasn’t the right way in our particular case as we didn’t use the same export parameters. At the end we couldn’t have more actors as it would have made the performance drop significantly.

# Results
Please see a screen recording of the usage of our functionalities on the following link. Note that we sometimes press keyboard buttons instead of buttons on the screen, which is why sometimes things change even though the mouse does not press any button.
[Video demonstration](https://youtu.be/5skgOikOyO0)

# Source files
See GitHub repo.


# Contributions
Oskar was responsible for the Perlin Noise, Cell Shading, Outlining, Car Noise and Bloom Effect. Jonathan was responsible for the User Interface, Setting up the Scene and adding its different Actors and meshes.

# References
## Exercises
Exercise 6 Shadows

Exercise 7 Perlin Noise

## Technical approach:
https://learnopengl.com/Advanced-Lighting/Bloom

https://en.wikipedia.org/wiki/Cel_shading

## Libraries:
gl-matrix_3.3.0

regljs_2.1.0

webgl-obj-loader_2.0.8

## Meshes:
car: https://free3d.com/3d-model/low-poly-racing-car-22092.html

alien: https://free3d.com/3d-model/alien-v1--660087.html

rocket: https://free3d.com/3d-model/simple-rocket-384414.html

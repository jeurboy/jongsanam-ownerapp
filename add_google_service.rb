require 'xcodeproj'

project_path = 'ios/JongSanamOwnerApp.xcodeproj'
file_name = 'GoogleService-Info.plist'
file_path = File.join(Dir.pwd, 'ios', file_name)

puts "Opening project at #{project_path}"
project = Xcodeproj::Project.open(project_path)

# Try to find the file reference first to avoid duplicates
file_ref = project.files.find { |f| f.path == file_name }

if file_ref
  puts "File reference already exists."
else
  # Add the file to the main group (root of the project in Xcode file navigator)
  # Since the file is in 'ios/', and project is in 'ios/', it is in the same dir as the .xcodeproj bundle's parent
  puts "Adding #{file_name} to project..."
  file_ref = project.main_group.new_file(file_path)
end

# Find the main target
target = project.targets.find { |t| t.name == 'JongSanamOwnerApp' }

if target
  puts "Found target: #{target.name}"
  
  # Check if it's already in the Copy Bundle Resources phase
  resources_phase = target.resources_build_phase
  build_file = resources_phase.files.find { |f| f.file_ref && f.file_ref.path == file_name }
  
  if build_file
    puts "File is already in Copy Bundle Resources phase."
  else
    puts "Adding file to Copy Bundle Resources phase..."
    resources_phase.add_file_reference(file_ref)
    puts "Added successfully."
  end
  
  project.save
  puts "Project saved."
else
  puts "Target 'JongSanamOwnerApp' not found."
end
